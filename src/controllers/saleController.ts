import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';
import { sendOrderEmailNotification, sendWhatsAppNotification } from '../utils/notificationService.js';

export const listSales = async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentStatus, search, startDate, endDate } = req.query;
    const where: any = {};

    if (paymentStatus && typeof paymentStatus === 'string' && paymentStatus !== 'All') {
      where.paymentStatus = paymentStatus;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { saleNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerEmail: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate && typeof startDate === 'string') where.saleDate.gte = new Date(startDate);
      if (endDate && typeof endDate === 'string') where.saleDate.lte = new Date(endDate);
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: true,
        items: { include: { inventory: true } },
      },
      orderBy: { saleDate: 'desc' },
    });

    const totalRevenue = sales.reduce((sum, s) => (s.paymentStatus === 'PAID' ? sum + s.total : sum), 0);

    res.json({ success: true, count: sales.length, totalRevenue, sales });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to list sales' });
  }
};

/**
 * Unified Sales Ledger combining Direct POS Sales, Rental Orders & Gallery Bookings
 */
export const getUnifiedSalesLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, status, search, startDate, endDate } = req.query;

    const [sales, rentals, bookings] = await Promise.all([
      prisma.sale.findMany({
        include: {
          customer: true,
          items: { include: { inventory: true } },
        },
        orderBy: { saleDate: 'desc' },
      }),
      prisma.rentalRequest.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      prisma.booking.findMany({
        include: {
          package: true,
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Format all 3 streams into unified order records
    const unified: Array<{
      id: string;
      orderType: 'SALE' | 'RENTAL' | 'BOOKING';
      referenceNumber: string;
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      date: Date | string;
      itemsCount: number;
      itemsDescription: string;
      itemsList: any[];
      subtotal: number;
      discount: number;
      tax?: number;
      deposit?: number;
      total: number;
      paymentStatus: string;
      status: string;
      location?: string | null;
      notes?: string | null;
      raw: any;
    }> = [];

    // 1. Direct Sales
    sales.forEach((s) => {
      unified.push({
        id: s.id,
        orderType: 'SALE',
        referenceNumber: s.saleNumber,
        customerName: s.customerName,
        customerEmail: s.customerEmail || 'N/A',
        customerPhone: s.customerPhone || 'N/A',
        date: s.saleDate,
        itemsCount: s.items.length,
        itemsDescription: s.items.map((i) => `${i.itemName} (x${i.quantity})`).join(', ') || 'Decor Sale Items',
        itemsList: s.items.map((i) => ({
          name: i.itemName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
        subtotal: s.subtotal,
        discount: s.discount,
        tax: s.tax,
        total: s.total,
        paymentStatus: s.paymentStatus,
        status: s.paymentStatus === 'PAID' ? 'COMPLETED' : 'PENDING',
        location: 'Studio Atelier Direct Sale',
        notes: s.notes,
        raw: s,
      });
    });

    // 2. Rental Orders
    rentals.forEach((r) => {
      let parsedItems: any[] = [];
      try {
        parsedItems = typeof r.itemsJson === 'string' ? JSON.parse(r.itemsJson) : (r.itemsJson as any) || [];
      } catch (e) {
        parsedItems = [];
      }

      const isPaid = r.status === 'APPROVED' || r.status === 'RENTED' || r.status === 'RETURNED';

      unified.push({
        id: r.id,
        orderType: 'RENTAL',
        referenceNumber: r.rentalNumber,
        customerName: r.customerName,
        customerEmail: r.customerEmail,
        customerPhone: r.customerPhone,
        date: r.createdAt,
        itemsCount: parsedItems.length,
        itemsDescription: parsedItems.map((i: any) => `${i.name || i.title || 'Rental Item'} (x${i.quantity})`).join(', ') || 'Rental Pieces',
        itemsList: parsedItems.map((i: any) => ({
          name: i.name || i.title || 'Rental Item',
          quantity: i.quantity,
          unitPrice: i.unitPrice || i.rentalPrice || i.unitRate || 0,
          total: (i.unitPrice || i.rentalPrice || i.unitRate || 0) * (i.quantity || 1),
        })),
        subtotal: r.subtotal,
        discount: r.discount,
        deposit: r.deposit,
        total: r.totalAmount,
        paymentStatus: isPaid ? 'PAID' : r.status === 'CANCELLED' ? 'CANCELLED' : 'PENDING',
        status: r.status,
        location: r.rentalMode ? `Rental Mode: ${r.rentalMode}` : 'Studio Rental',
        notes: r.notes,
        raw: r,
      });
    });

    // 3. Gallery / Event Bookings
    bookings.forEach((b) => {
      const isPaid = b.status === 'CONFIRMED' || b.status === 'COMPLETED';

      unified.push({
        id: b.id,
        orderType: 'BOOKING',
        referenceNumber: b.bookingNumber,
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        customerPhone: b.customerPhone,
        date: b.createdAt,
        itemsCount: 1,
        itemsDescription: b.packageName || `${b.eventType} Styling Package`,
        itemsList: [
          {
            name: b.packageName || `${b.eventType} Styling Package`,
            quantity: 1,
            unitPrice: b.totalAmount,
            total: b.totalAmount,
          },
        ],
        subtotal: b.totalAmount,
        discount: 0,
        total: b.totalAmount,
        paymentStatus: isPaid ? 'PAID' : b.status === 'CANCELLED' ? 'CANCELLED' : 'PENDING',
        status: b.status,
        location: b.venue || 'Venue TBD',
        notes: b.specialRequests || b.internalNotes,
        raw: b,
      });
    });

    // Sort by latest date first
    unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filter by type
    let filtered = [...unified];
    if (type && typeof type === 'string' && type !== 'All') {
      filtered = filtered.filter((u) => u.orderType === type);
    }

    // Filter by status
    if (status && typeof status === 'string' && status !== 'All') {
      filtered = filtered.filter((u) => u.paymentStatus === status || u.status === status);
    }

    // Filter by search query
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.referenceNumber.toLowerCase().includes(q) ||
          u.customerName.toLowerCase().includes(q) ||
          u.customerEmail.toLowerCase().includes(q) ||
          u.customerPhone.toLowerCase().includes(q) ||
          u.itemsDescription.toLowerCase().includes(q)
      );
    }

    // Calculate dynamic analytics
    const totalGrossRevenue = unified.filter((u) => u.paymentStatus === 'PAID').reduce((sum, u) => sum + u.total, 0);
    const totalPendingRevenue = unified.filter((u) => u.paymentStatus === 'PENDING').reduce((sum, u) => sum + u.total, 0);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayPaidRevenue = unified
      .filter((u) => u.paymentStatus === 'PAID' && new Date(u.date) >= startOfToday)
      .reduce((sum, u) => sum + u.total, 0);
    const todayOrdersCount = unified.filter((u) => new Date(u.date) >= startOfToday).length;

    res.json({
      success: true,
      count: filtered.length,
      totalCount: unified.length,
      summary: {
        totalGrossRevenue,
        totalPendingRevenue,
        todayPaidRevenue,
        todayOrdersCount,
        salesCount: sales.length,
        rentalsCount: rentals.length,
        bookingsCount: bookings.length,
      },
      orders: filtered,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to get unified sales ledger' });
  }
};

export const getSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { inventory: true } },
      },
    });

    if (!sale) {
      res.status(404).json({ success: false, message: 'Sale not found' });
      return;
    }

    res.json({ success: true, sale });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to get sale' });
  }
};

export const createSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      customerId,
      items,
      discount,
      tax,
      paymentStatus,
      saleDate,
      notes,
    } = req.body;

    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Customer name and at least one item are required' });
      return;
    }

    let subtotal = 0;
    const validatedItems: { inventoryId?: string | null; itemName: string; quantity: number; unitPrice: number; total: number }[] = [];

    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      const itemTotal = qty * unitPrice;
      subtotal += itemTotal;

      if (item.inventoryId) {
        const invItem = await prisma.inventory.findUnique({ where: { id: String(item.inventoryId) } });
        if (invItem && invItem.availableQuantity < qty) {
          res.status(400).json({
            success: false,
            message: `Cannot sell ${qty} units of "${invItem.name}". Available inventory is only ${invItem.availableQuantity}`,
          });
          return;
        }
      }

      validatedItems.push({
        inventoryId: item.inventoryId ? String(item.inventoryId) : null,
        itemName: item.itemName ? String(item.itemName) : 'Decor Sale Item',
        quantity: qty,
        unitPrice,
        total: itemTotal,
      });
    }

    const disc = Number(discount) || 0;
    const tx = Number(tax) || 0;
    const total = Math.max(0, subtotal - disc + tx);
    const saleNumber = `SALE-${Date.now().toString().slice(-6)}`;

    let effectiveCustId = customerId ? String(customerId) : null;
    if (!effectiveCustId && customerEmail) {
      const cust = await prisma.customer.upsert({
        where: { email: String(customerEmail).toLowerCase() },
        update: { name: String(customerName), phone: customerPhone ? String(customerPhone) : undefined },
        create: { name: String(customerName), email: String(customerEmail).toLowerCase(), phone: customerPhone ? String(customerPhone) : null },
      });
      effectiveCustId = cust.id;
    }

    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        customerId: effectiveCustId || null,
        customerName: String(customerName),
        customerEmail: customerEmail ? String(customerEmail).toLowerCase() : null,
        customerPhone: customerPhone ? String(customerPhone) : null,
        subtotal,
        discount: disc,
        tax: tx,
        total,
        paymentStatus: paymentStatus ? String(paymentStatus) : 'PAID',
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        notes: notes ? String(notes) : null,
        items: {
          create: validatedItems,
        },
      },
      include: {
        items: true,
      },
    });

    // Deduct inventory stock automatically
    for (const item of validatedItems) {
      if (item.inventoryId) {
        const inv = await prisma.inventory.findUnique({ where: { id: item.inventoryId } });
        if (inv) {
          const newQty = Math.max(0, inv.quantity - item.quantity);
          const newAvail = Math.max(0, inv.availableQuantity - item.quantity);
          await prisma.inventory.update({
            where: { id: item.inventoryId },
            data: {
              quantity: newQty,
              availableQuantity: newAvail,
              status: newAvail <= 0 ? 'OUT_OF_STOCK' : newAvail <= inv.minThreshold ? 'LOW_STOCK' : 'IN_STOCK',
            },
          });
        }
      }
    }

    if (effectiveCustId && (paymentStatus === 'PAID' || !paymentStatus)) {
      await prisma.customer.update({
        where: { id: effectiveCustId },
        data: { totalSpend: { increment: total } },
      });
    }

    await logActivity({
      req,
      action: 'CREATE',
      module: 'SALES',
      description: `Created Sale #${sale.saleNumber} for ${customerName} ($${total.toFixed(2)}) - ${validatedItems.length} items`,
      metadata: { saleId: sale.id, saleNumber, total, itemsCount: validatedItems.length },
    });

    const notificationPayload = {
      orderType: 'SALE' as const,
      referenceNumber: saleNumber,
      customerName: String(customerName),
      customerEmail: customerEmail ? String(customerEmail) : 'walk-in@lumiere.com',
      customerPhone: customerPhone ? String(customerPhone) : 'N/A',
      location: 'Studio POS / Direct Sale',
      items: validatedItems.map((i) => ({ name: i.itemName, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
      subtotal,
      discount: disc,
      tax: tx,
      totalAmount: total,
      notes: notes ? String(notes) : null,
    };

    sendOrderEmailNotification(notificationPayload).catch((e) => console.warn('Email dispatch error:', e));
    const waResult = await sendWhatsAppNotification(notificationPayload).catch(() => ({ waLink: '' }));

    res.status(201).json({
      success: true,
      message: 'Sale registered successfully',
      sale,
      waNotificationLink: waResult?.waLink || '',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create sale' });
  }
};

export const updateSaleStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { paymentStatus, notes } = req.body;

    const existing = await prisma.sale.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Sale not found' });
      return;
    }

    const updated = await prisma.sale.update({
      where: { id },
      data: {
        paymentStatus: paymentStatus ? String(paymentStatus) : existing.paymentStatus,
        notes: notes !== undefined ? (notes ? String(notes) : null) : existing.notes,
      },
    });

    await logActivity({
      req,
      action: 'UPDATE',
      module: 'SALES',
      description: `Updated payment status for Sale #${existing.saleNumber} to ${updated.paymentStatus}`,
      metadata: { saleId: id, oldStatus: existing.paymentStatus, newStatus: updated.paymentStatus },
    });

    res.json({ success: true, message: 'Sale updated successfully', sale: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update sale' });
  }
};

export const deleteSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Sale not found' });
      return;
    }

    // Delete line items and sale
    await prisma.saleItem.deleteMany({ where: { saleId: id } });
    await prisma.sale.delete({ where: { id } });

    await logActivity({
      req,
      action: 'DELETE',
      module: 'SALES',
      description: `Deleted Sale #${existing.saleNumber}`,
      metadata: { saleId: id, saleNumber: existing.saleNumber },
    });

    res.json({ success: true, message: 'Sale record deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete sale' });
  }
};
