import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';

export const listCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    const where: any = {};

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: {
            bookings: true,
            rentalRequests: true,
            sales: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: customers.length, customers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to list customers' });
  }
};

export const getCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        bookings: { orderBy: { eventDate: 'desc' } },
        rentalRequests: { orderBy: { createdAt: 'desc' } },
        sales: { orderBy: { saleDate: 'desc' } },
      },
    });

    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    res.json({ success: true, customer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to get customer' });
  }
};

export const createCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, address, notes } = req.body;

    if (!name || !email) {
      res.status(400).json({ success: false, message: 'Name and email are required' });
      return;
    }

    const existing = await prisma.customer.findUnique({ where: { email: String(email).toLowerCase() } });
    if (existing) {
      res.status(400).json({ success: false, message: 'Customer with this email already exists' });
      return;
    }

    const customer = await prisma.customer.create({
      data: {
        name: String(name),
        email: String(email).toLowerCase(),
        phone: phone ? String(phone) : null,
        address: address ? String(address) : null,
        notes: notes ? String(notes) : null,
      },
    });

    await logActivity({
      req,
      action: 'CREATE',
      module: 'CUSTOMERS',
      description: `Created customer record for ${customer.name} (${customer.email})`,
      metadata: { customerId: customer.id, email: customer.email },
    });

    res.status(201).json({ success: true, message: 'Customer created successfully', customer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create customer' });
  }
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, phone, address, notes } = req.body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: name ? String(name) : existing.name,
        phone: phone !== undefined ? (phone ? String(phone) : null) : existing.phone,
        address: address !== undefined ? (address ? String(address) : null) : existing.address,
        notes: notes !== undefined ? (notes ? String(notes) : null) : existing.notes,
      },
    });

    await logActivity({
      req,
      action: 'UPDATE',
      module: 'CUSTOMERS',
      description: `Updated customer record for ${updated.name}`,
      metadata: { customerId: updated.id },
    });

    res.json({ success: true, message: 'Customer updated successfully', customer: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update customer' });
  }
};

export const deleteCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    await prisma.customer.delete({ where: { id } });

    await logActivity({
      req,
      action: 'DELETE',
      module: 'CUSTOMERS',
      description: `Deleted customer record: ${existing.name} (${existing.email})`,
      metadata: { customerId: id, email: existing.email },
    });

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete customer' });
  }
};
