import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';

export const listTestimonials = async (req: Request, res: Response): Promise<void> => {
  try {
    const { includeInactive } = req.query;
    const where: any = {};

    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    const testimonials = await prisma.testimonial.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, count: testimonials.length, testimonials });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch testimonials' });
  }
};

export const createTestimonial = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientName, clientRole, eventType, comment, rating, avatarUrl, isActive, isFeatured, displayOrder } = req.body;

    if (!clientName || !comment) {
      res.status(400).json({ success: false, message: 'Client name and comment are required' });
      return;
    }

    const testimonial = await prisma.testimonial.create({
      data: {
        clientName: String(clientName),
        clientRole: clientRole ? String(clientRole) : 'Delighted Client',
        eventType: eventType ? String(eventType) : 'Luxury Event',
        comment: String(comment),
        rating: Number(rating) || 5,
        avatarUrl: avatarUrl ? String(avatarUrl) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        isFeatured: Boolean(isFeatured),
        displayOrder: Number(displayOrder) || 0,
      },
    });

    await logActivity({
      req,
      action: 'CREATE',
      module: 'TESTIMONIALS',
      description: `Added testimonial from "${testimonial.clientName}"`,
      metadata: { testimonialId: testimonial.id, clientName: testimonial.clientName },
    });

    res.status(201).json({ success: true, message: 'Testimonial created successfully', testimonial });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create testimonial' });
  }
};

export const updateTestimonial = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { clientName, clientRole, eventType, comment, rating, avatarUrl, isActive, isFeatured, displayOrder } = req.body;

    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Testimonial not found' });
      return;
    }

    const updateData: any = {};
    if (clientName) updateData.clientName = String(clientName);
    if (clientRole !== undefined) updateData.clientRole = clientRole ? String(clientRole) : 'Delighted Client';
    if (eventType !== undefined) updateData.eventType = eventType ? String(eventType) : 'Luxury Event';
    if (comment) updateData.comment = String(comment);
    if (rating !== undefined) updateData.rating = Number(rating);
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl ? String(avatarUrl) : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
    if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);

    const updated = await prisma.testimonial.update({
      where: { id },
      data: updateData,
    });

    await logActivity({
      req,
      action: 'UPDATE',
      module: 'TESTIMONIALS',
      description: `Updated testimonial from "${updated.clientName}"`,
      metadata: { testimonialId: updated.id, clientName: updated.clientName },
    });

    res.json({ success: true, message: 'Testimonial updated successfully', testimonial: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update testimonial' });
  }
};

export const deleteTestimonial = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Testimonial not found' });
      return;
    }

    await prisma.testimonial.delete({ where: { id } });

    await logActivity({
      req,
      action: 'DELETE',
      module: 'TESTIMONIALS',
      description: `Deleted testimonial from: "${existing.clientName}"`,
      metadata: { testimonialId: id, clientName: existing.clientName },
    });

    res.json({ success: true, message: 'Testimonial deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete testimonial' });
  }
};
