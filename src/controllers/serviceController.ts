import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';

export const listServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { includeInactive } = req.query;
    const where: any = {};
    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });

    const parsedServices = services.map((s) => ({
      ...s,
      features: typeof s.features === 'string' ? JSON.parse(s.features || '[]') : s.features,
    }));

    res.json({ success: true, count: parsedServices.length, services: parsedServices });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch services' });
  }
};

export const getServiceBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug as string;
    const service = await prisma.service.findUnique({
      where: { slug },
    });

    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    res.json({
      success: true,
      service: {
        ...service,
        features: typeof service.features === 'string' ? JSON.parse(service.features || '[]') : service.features,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch service' });
  }
};

export const createService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, subtitle, description, icon, imageUrl, priceStartingAt, features, displayOrder, isActive } = req.body;

    if (!title || !description || !imageUrl) {
      res.status(400).json({ success: false, message: 'Title, description, and image URL are required' });
      return;
    }

    const slug = `${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    const service = await prisma.service.create({
      data: {
        title: String(title),
        slug,
        subtitle: subtitle ? String(subtitle) : null,
        description: String(description),
        icon: icon ? String(icon) : null,
        imageUrl: String(imageUrl),
        priceStartingAt: Number(priceStartingAt) || 0,
        features: JSON.stringify(Array.isArray(features) ? features : []),
        displayOrder: Number(displayOrder) || 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    await logActivity({
      req,
      action: 'CREATE',
      module: 'SERVICES',
      description: `Created new service: "${service.title}"`,
      metadata: { serviceId: service.id, title: service.title },
    });

    res.status(201).json({ success: true, message: 'Service created successfully', service });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create service' });
  }
};

export const updateService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title, subtitle, description, icon, imageUrl, priceStartingAt, features, displayOrder, isActive } = req.body;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    const updateData: any = {};
    if (title) updateData.title = String(title);
    if (subtitle !== undefined) updateData.subtitle = subtitle ? String(subtitle) : null;
    if (description) updateData.description = String(description);
    if (icon !== undefined) updateData.icon = icon ? String(icon) : null;
    if (imageUrl) updateData.imageUrl = String(imageUrl);
    if (priceStartingAt !== undefined) updateData.priceStartingAt = Number(priceStartingAt);
    if (features !== undefined) updateData.features = JSON.stringify(Array.isArray(features) ? features : []);
    if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.service.update({
      where: { id },
      data: updateData,
    });

    await logActivity({
      req,
      action: 'UPDATE',
      module: 'SERVICES',
      description: `Updated service: "${updated.title}"`,
      metadata: { serviceId: updated.id, title: updated.title },
    });

    res.json({ success: true, message: 'Service updated successfully', service: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update service' });
  }
};

export const deleteService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    await prisma.service.delete({ where: { id } });

    await logActivity({
      req,
      action: 'DELETE',
      module: 'SERVICES',
      description: `Deleted service: "${existing.title}"`,
      metadata: { serviceId: id, title: existing.title },
    });

    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete service' });
  }
};
