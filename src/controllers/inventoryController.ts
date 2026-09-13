import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';

export const listInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, status, lowStock, search } = req.query;
    const where: any = {};

    if (category && typeof category === 'string' && category !== 'All') {
      where.category = category;
    }

    if (status && typeof status === 'string' && status !== 'All') {
      where.status = status;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { category: { contains: search } },
      ];
    }

    let items = await prisma.inventory.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    if (lowStock === 'true') {
      items = items.filter((item) => item.availableQuantity <= item.minThreshold);
    }

    const summary = {
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      totalAvailable: items.reduce((sum, item) => sum + item.availableQuantity, 0),
      lowStockCount: items.filter((item) => item.availableQuantity <= item.minThreshold && item.availableQuantity > 0).length,
      outOfStockCount: items.filter((item) => item.availableQuantity <= 0).length,
    };

    res.json({ success: true, summary, count: items.length, inventory: items });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch inventory' });
  }
};

export const getInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const item = await prisma.inventory.findUnique({
      where: { id },
      include: {
        saleItems: { include: { sale: true }, take: 10 },
        purchaseItems: { include: { purchase: true }, take: 10 },
      },
    });

    if (!item) {
      res.status(404).json({ success: false, message: 'Inventory item not found' });
      return;
    }

    res.json({ success: true, item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch item' });
  }
};

export const createInventoryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sku, name, category, quantity, minThreshold, purchaseCost, rentalPrice, location, notes } = req.body;

    if (!name || !category) {
      res.status(400).json({ success: false, message: 'Name and category are required' });
      return;
    }

    const itemSku = sku || `INV-${String(name).slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const initialQty = Number(quantity) || 0;

    const item = await prisma.inventory.create({
      data: {
        sku: String(itemSku),
        name: String(name),
        category: String(category),
        quantity: initialQty,
        availableQuantity: initialQty,
        minThreshold: Number(minThreshold) || 5,
        purchaseCost: Number(purchaseCost) || 0,
        rentalPrice: Number(rentalPrice) || 0,
        location: location ? String(location) : null,
        status: initialQty <= 0 ? 'OUT_OF_STOCK' : initialQty <= (Number(minThreshold) || 5) ? 'LOW_STOCK' : 'IN_STOCK',
        notes: notes ? String(notes) : null,
        lastRestockedAt: initialQty > 0 ? new Date() : null,
      },
    });

    await logActivity({
      req,
      action: 'CREATE',
      module: 'INVENTORY',
      description: `Added inventory item: "${item.name}" (SKU: ${item.sku}, Qty: ${item.quantity})`,
      metadata: { inventoryId: item.id, sku: item.sku, quantity: item.quantity },
    });

    res.status(201).json({ success: true, message: 'Inventory item created successfully', item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create inventory item' });
  }
};

export const updateInventoryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { sku, name, category, quantity, availableQuantity, minThreshold, purchaseCost, rentalPrice, location, status, notes } = req.body;

    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Inventory item not found' });
      return;
    }

    const updateData: any = {};
    if (sku) updateData.sku = String(sku);
    if (name) updateData.name = String(name);
    if (category) updateData.category = String(category);
    if (location !== undefined) updateData.location = location ? String(location) : null;
    if (notes !== undefined) updateData.notes = notes ? String(notes) : null;
    if (minThreshold !== undefined) updateData.minThreshold = Number(minThreshold);
    if (purchaseCost !== undefined) updateData.purchaseCost = Number(purchaseCost);
    if (rentalPrice !== undefined) updateData.rentalPrice = Number(rentalPrice);

    if (quantity !== undefined) {
      const newQty = Number(quantity);
      updateData.quantity = newQty;
      if (availableQuantity === undefined) {
        const diff = newQty - existing.quantity;
        updateData.availableQuantity = Math.max(0, existing.availableQuantity + diff);
      }
    }

    if (availableQuantity !== undefined) {
      updateData.availableQuantity = Number(availableQuantity);
    }

    const effectiveAvail = updateData.availableQuantity !== undefined ? updateData.availableQuantity : existing.availableQuantity;
    const effectiveMin = updateData.minThreshold !== undefined ? updateData.minThreshold : existing.minThreshold;

    if (status) {
      updateData.status = String(status);
    } else {
      updateData.status = effectiveAvail <= 0 ? 'OUT_OF_STOCK' : effectiveAvail <= effectiveMin ? 'LOW_STOCK' : 'IN_STOCK';
    }

    const updated = await prisma.inventory.update({
      where: { id },
      data: updateData,
    });

    // Synchronize corresponding RentalItem if exists
    const cleanName = updated.name.replace(/^Rental:\s*/i, '');
    await prisma.rentalItem.updateMany({
      where: {
        OR: [
          { name: updated.name },
          { name: cleanName },
        ],
      },
      data: {
        totalQuantity: updated.quantity,
        availableQuantity: updated.availableQuantity,
        rentalPrice: updated.rentalPrice,
        hourlyRate: updated.hourlyRate,
        status: updated.availableQuantity <= 0 ? 'OUT_OF_STOCK' : updated.availableQuantity <= 2 ? 'LOW_STOCK' : 'AVAILABLE',
      },
    });

    await logActivity({
      req,
      action: 'UPDATE',
      module: 'INVENTORY',
      description: `Updated inventory item "${updated.name}" (${updated.sku})`,
      metadata: { inventoryId: updated.id, sku: updated.sku },
    });

    res.json({ success: true, message: 'Inventory item updated successfully', item: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update inventory item' });
  }
};

export const deleteInventoryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Inventory item not found' });
      return;
    }

    await prisma.inventory.delete({ where: { id } });

    await logActivity({
      req,
      action: 'DELETE',
      module: 'INVENTORY',
      description: `Deleted inventory item: "${existing.name}" (${existing.sku})`,
      metadata: { inventoryId: id, sku: existing.sku },
    });

    res.json({ success: true, message: 'Inventory item deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete inventory item' });
  }
};

export const adjustStock = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { delta, reason } = req.body;

    if (delta === undefined || typeof delta !== 'number') {
      res.status(400).json({ success: false, message: 'Numeric delta adjustment is required' });
      return;
    }

    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Inventory item not found' });
      return;
    }

    const newQty = Math.max(0, existing.quantity + delta);
    const newAvail = Math.max(0, existing.availableQuantity + delta);
    const newStatus = newAvail <= 0 ? 'OUT_OF_STOCK' : newAvail <= existing.minThreshold ? 'LOW_STOCK' : 'IN_STOCK';

    const updated = await prisma.inventory.update({
      where: { id },
      data: {
        quantity: newQty,
        availableQuantity: newAvail,
        status: newStatus,
        lastRestockedAt: delta > 0 ? new Date() : existing.lastRestockedAt,
      },
    });

    // Synchronize corresponding RentalItem if exists
    const cleanName = updated.name.replace(/^Rental:\s*/i, '');
    await prisma.rentalItem.updateMany({
      where: {
        OR: [
          { name: updated.name },
          { name: cleanName },
        ],
      },
      data: {
        totalQuantity: newQty,
        availableQuantity: newAvail,
        status: newAvail <= 0 ? 'OUT_OF_STOCK' : newAvail <= 2 ? 'LOW_STOCK' : 'AVAILABLE',
      },
    });

    await logActivity({
      req,
      action: 'STOCK_ADJUSTMENT',
      module: 'INVENTORY',
      description: `Adjusted stock for "${updated.name}" by ${delta > 0 ? '+' : ''}${delta}. Reason: ${reason || 'Manual adjustment'}. New available: ${newAvail}`,
      metadata: { inventoryId: id, delta, oldQty: existing.quantity, newQty, reason },
    });

    res.json({ success: true, message: 'Stock adjusted successfully', item: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to adjust stock' });
  }
};
