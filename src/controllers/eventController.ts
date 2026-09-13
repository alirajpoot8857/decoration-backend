import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';

export const listEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, eventType, startDate, endDate } = req.query;
    const where: any = {};

    if (status && typeof status === 'string' && status !== 'All') {
      where.status = status;
    }

    if (eventType && typeof eventType === 'string' && eventType !== 'All') {
      where.eventType = eventType;
    }

    if (startDate || endDate) {
      where.eventDate = {};
      if (startDate && typeof startDate === 'string') where.eventDate.gte = new Date(startDate);
      if (endDate && typeof endDate === 'string') where.eventDate.lte = new Date(endDate);
    }

    const events = await prisma.event.findMany({
      where,
      include: { booking: true },
      orderBy: { eventDate: 'asc' },
    });

    res.json({ success: true, count: events.length, events });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to list events' });
  }
};

export const getEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const event = await prisma.event.findUnique({
      where: { id },
      include: { booking: true },
    });

    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    res.json({ success: true, event });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to get event' });
  }
};

export const createEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, bookingId, eventType, eventDate, endDate, venue, clientName, clientPhone, status, setupTeamNotes } = req.body;

    if (!title || !eventType || !eventDate || !venue || !clientName) {
      res.status(400).json({ success: false, message: 'Missing required event fields' });
      return;
    }

    const event = await prisma.event.create({
      data: {
        title: String(title),
        bookingId: bookingId ? String(bookingId) : null,
        eventType: String(eventType),
        eventDate: new Date(eventDate),
        endDate: endDate ? new Date(endDate) : null,
        venue: String(venue),
        clientName: String(clientName),
        clientPhone: clientPhone ? String(clientPhone) : null,
        status: status ? String(status) : 'SCHEDULED',
        setupTeamNotes: setupTeamNotes ? String(setupTeamNotes) : null,
      },
    });

    await logActivity({
      req,
      action: 'CREATE',
      module: 'EVENTS',
      description: `Scheduled event: "${event.title}" at ${event.venue} on ${new Date(event.eventDate).toLocaleDateString()}`,
      metadata: { eventId: event.id, title: event.title, date: event.eventDate },
    });

    res.status(201).json({ success: true, message: 'Event created successfully', event });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create event' });
  }
};

export const updateEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title, eventType, eventDate, endDate, venue, clientName, clientPhone, status, setupTeamNotes } = req.body;

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const updateData: any = {};
    if (title) updateData.title = String(title);
    if (eventType) updateData.eventType = String(eventType);
    if (eventDate) updateData.eventDate = new Date(eventDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (venue) updateData.venue = String(venue);
    if (clientName) updateData.clientName = String(clientName);
    if (clientPhone !== undefined) updateData.clientPhone = clientPhone ? String(clientPhone) : null;
    if (status) updateData.status = String(status);
    if (setupTeamNotes !== undefined) updateData.setupTeamNotes = setupTeamNotes ? String(setupTeamNotes) : null;

    const updated = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    await logActivity({
      req,
      action: 'UPDATE',
      module: 'EVENTS',
      description: `Updated event details for "${updated.title}"`,
      metadata: { eventId: updated.id, title: updated.title, status: updated.status },
    });

    res.json({ success: true, message: 'Event updated successfully', event: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update event' });
  }
};

export const deleteEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    await prisma.event.delete({ where: { id } });

    await logActivity({
      req,
      action: 'DELETE',
      module: 'EVENTS',
      description: `Deleted event: "${existing.title}"`,
      metadata: { eventId: id, title: existing.title },
    });

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete event' });
  }
};
