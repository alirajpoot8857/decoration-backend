import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';

export const listPurchases = async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentStatus, search, startDate, endDate } = req.query;
    const where: any = {};

    if (paymentStatus && typeof paymentStatus === 'string' && paymentStatus !== 'All') {
      where.paymentStatus = paymentStatus;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { purchaseNumber: { contains: search } },
        { supplierName: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.purchaseDate = {};
      if (startDate && typeof startDate === 'string') where.purchaseDate.gte = new Date(startDate);
      if (endDate && typeof endDate === 'string') where.purchaseDate.lte = new Date(endDate);
    }

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        items: { include: { inventory: true } },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    const totalExpense = purchases.reduce((sum, p) => (p.paymentStatus === 'PAID' ? sum + p.total : sum), 0);

    res.json({ success: true, count: purchases.length, totalExpense, purchases });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to list purchases' });
  }
};

export const getPurchase = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        items: { include: { inventory: true } },
      },
    });

    if (!purchase) {
      res.status(404).json({ success: false, message: 'Purchase not found' });
      return;
    }

    res.json({ success: true, purchase });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to get purchase' });
  }
};

export const createPurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      supplierName,
      supplierContact,
      items,
      tax,
      paymentStatus,
      purchaseDate,
      notes,
    } = req.body;

    if (!supplierName || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Supplier name and at least one item are required' });
      return;
    }

    let subtotal = 0;
    const validatedItems: { inventoryId?: string | null; itemName: string; quantity: number; unitCost: number; total: number }[] = [];

    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const unitCost = Number(item.unitCost) || 0;
      const itemTotal = qty * unitCost;
      subtotal += itemTotal;

      validatedItems.push({
        inventoryId: item.inventoryId ? String(item.inventoryId) : null,
        itemName: item.itemName ? String(item.itemName) : 'Inventory Supply',
        quantity: qty,
        unitCost,
        total: itemTotal,
      });
    }

    const tx = Number(tax) || 0;
    const total = subtotal + tx;
    const purchaseNumber = `PO-${Date.now().toString().slice(-6)}`;

    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber,
        supplierName: String(supplierName),
        supplierContact: supplierContact ? String(supplierContact) : null,
        subtotal,
        tax: tx,
        total,
        paymentStatus: paymentStatus ? String(paymentStatus) : 'PAID',
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        notes: notes ? String(notes) : null,
        items: {
          create: validatedItems,
        },
      },
      include: {
        items: true,
      },
    });

    // Auto-increment inventory stock
    for (const item of validatedItems) {
      if (item.inventoryId) {
        const inv = await prisma.inventory.findUnique({ where: { id: item.inventoryId } });
        if (inv) {
          const newQty = inv.quantity + item.quantity;
          const newAvail = inv.availableQuantity + item.quantity;
          await prisma.inventory.update({
            where: { id: item.inventoryId },
            data: {
              quantity: newQty,
              availableQuantity: newAvail,
              purchaseCost: item.unitCost || inv.purchaseCost,
              status: newAvail <= 0 ? 'OUT_OF_STOCK' : newAvail <= inv.minThreshold ? 'LOW_STOCK' : 'IN_STOCK',
              lastRestockedAt: new Date(),
            },
          });
        }
      }
    }

    await logActivity({
      req,
      action: 'CREATE',
      module: 'PURCHASES',
      description: `Created Purchase Order #${purchase.purchaseNumber} from ${supplierName} ($${total.toFixed(2)})`,
      metadata: { purchaseId: purchase.id, purchaseNumber, total, itemsCount: validatedItems.length },
    });

    res.status(201).json({ success: true, message: 'Purchase order created successfully', purchase });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create purchase' });
  }
};

export const updatePurchaseStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { paymentStatus, notes } = req.body;

    const existing = await prisma.purchase.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Purchase not found' });
      return;
    }

    const updated = await prisma.purchase.update({
      where: { id },
      data: {
        paymentStatus: paymentStatus ? String(paymentStatus) : existing.paymentStatus,
        notes: notes !== undefined ? (notes ? String(notes) : null) : existing.notes,
      },
    });

    await logActivity({
      req,
      action: 'UPDATE',
      module: 'PURCHASES',
      description: `Updated payment status for PO #${existing.purchaseNumber} to ${updated.paymentStatus}`,
      metadata: { purchaseId: id, oldStatus: existing.paymentStatus, newStatus: updated.paymentStatus },
    });

    res.json({ success: true, message: 'Purchase updated successfully', purchase: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update purchase' });
  }
};

export const deletePurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.purchase.findUnique({ where: { id }, include: { items: true } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Purchase not found' });
      return;
    }

    await prisma.purchaseItem.deleteMany({ where: { purchaseId: id } });
    await prisma.purchase.delete({ where: { id } });

    await logActivity({
      req,
      action: 'DELETE',
      module: 'PURCHASES',
      description: `Deleted Purchase Order #${existing.purchaseNumber}`,
      metadata: { purchaseId: id, purchaseNumber: existing.purchaseNumber },
    });

    res.json({ success: true, message: 'Purchase order deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete purchase' });
  }
};
