import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';
import { sendOrderEmailNotification, sendWhatsAppNotification } from '../utils/notificationService.js';
import { isValidPakistaniPhone } from '../utils/validation.js';

export const submitInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, eventType, eventDate, message } = req.body;

    if (!name || !email || !message) {
      res.status(400).json({ success: false, message: 'Name, email, and message are required' });
      return;
    }

    if (phone && !isValidPakistaniPhone(phone)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid Pakistani phone number (e.g. 03140660985 or +923140660985)',
      });
      return;
    }

    const inquiry = await prisma.contactInquiry.create({
      data: {
        name: String(name),
        email: String(email).toLowerCase(),
        phone: phone ? String(phone) : null,
        eventType: eventType ? String(eventType) : null,
        eventDate: eventDate ? String(eventDate) : null,
        message: String(message),
        status: 'NEW',
      },
    });

    await logActivity({
      req,
      action: 'INQUIRY_SUBMITTED',
      module: 'CONTACT',
      description: `New contact inquiry received from ${inquiry.name} (${inquiry.email})`,
      metadata: { inquiryId: inquiry.id, name: inquiry.name, email: inquiry.email },
    });

    const notificationPayload = {
      orderType: 'INQUIRY' as const,
      referenceNumber: `INQ-${inquiry.id.slice(-6).toUpperCase()}`,
      customerName: String(name),
      customerEmail: String(email),
      customerPhone: phone ? String(phone) : 'N/A',
      location: eventType ? `Event Type: ${eventType}` : undefined,
      eventDate: eventDate ? String(eventDate) : undefined,
      totalAmount: 0,
      notes: String(message),
    };

    sendOrderEmailNotification(notificationPayload).catch((e) => console.warn('Email dispatch error:', e));
    sendWhatsAppNotification(notificationPayload).catch((e) => console.warn('WA dispatch error:', e));

    res.status(201).json({
      success: true,
      message: 'Your inquiry has been received. Our luxury events team will contact you shortly.',
      inquiry,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to submit inquiry' });
  }
};

export const listInquiries = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;
    const where: any = {};

    if (status && typeof status === 'string' && status !== 'All') {
      where.status = status;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { message: { contains: search } },
      ];
    }

    const inquiries = await prisma.contactInquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: inquiries.length, inquiries });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to list inquiries' });
  }
};

export const updateInquiryStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, internalNotes } = req.body;

    const existing = await prisma.contactInquiry.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Inquiry not found' });
      return;
    }

    const updateData: any = {};
    if (status) updateData.status = String(status);
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes ? String(internalNotes) : null;

    const updated = await prisma.contactInquiry.update({
      where: { id },
      data: updateData,
    });

    await logActivity({
      req,
      action: 'UPDATE',
      module: 'CONTACT',
      description: `Updated inquiry from ${existing.name} to status "${updated.status}"`,
      metadata: { inquiryId: id, oldStatus: existing.status, newStatus: updated.status },
    });

    res.json({ success: true, message: 'Inquiry updated successfully', inquiry: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update inquiry' });
  }
};

export const deleteInquiry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.contactInquiry.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Inquiry not found' });
      return;
    }

    await prisma.contactInquiry.delete({ where: { id } });

    await logActivity({
      req,
      action: 'DELETE',
      module: 'CONTACT',
      description: `Deleted inquiry from: "${existing.name}"`,
      metadata: { inquiryId: id, email: existing.email },
    });

    res.json({ success: true, message: 'Inquiry deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete inquiry' });
  }
};
