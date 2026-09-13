import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLogger.js';

export const listGallery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, featured, includeInactive } = req.query;
    const where: any = {};

    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    if (category && typeof category === 'string' && category !== 'All') {
      where.category = category;
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    const images = await prisma.galleryImage.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const parsedImages = images.map((img) => ({
      ...img,
      tags: typeof img.tags === 'string' ? JSON.parse(img.tags || '[]') : img.tags,
    }));

    res.json({ success: true, count: parsedImages.length, images: parsedImages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch gallery' });
  }
};

export const createGalleryImage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, category, description, imageUrl, isFeatured, displayOrder, isActive, eventType, tags } = req.body;

    if (!title || !category || !imageUrl) {
      res.status(400).json({ success: false, message: 'Title, category, and image URL are required' });
      return;
    }

    const image = await prisma.galleryImage.create({
      data: {
        title: String(title),
        category: String(category),
        description: description ? String(description) : null,
        imageUrl: String(imageUrl),
        isFeatured: Boolean(isFeatured),
        displayOrder: Number(displayOrder) || 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        eventType: eventType ? String(eventType) : null,
        tags: JSON.stringify(Array.isArray(tags) ? tags : []),
      },
    });

    await logActivity({
      req,
      action: 'CREATE',
      module: 'GALLERY',
      description: `Uploaded/added gallery image: "${image.title}" in category "${image.category}"`,
      metadata: { imageId: image.id, title: image.title, category: image.category },
    });

    res.status(201).json({ success: true, message: 'Gallery image created', image });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create gallery image' });
  }
};

export const updateGalleryImage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title, category, description, imageUrl, isFeatured, displayOrder, isActive, eventType, tags } = req.body;

    const existing = await prisma.galleryImage.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Gallery image not found' });
      return;
    }

    const updateData: any = {};
    if (title) updateData.title = String(title);
    if (category) updateData.category = String(category);
    if (description !== undefined) updateData.description = description ? String(description) : null;
    if (imageUrl) updateData.imageUrl = String(imageUrl);
    if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
    if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (eventType !== undefined) updateData.eventType = eventType ? String(eventType) : null;
    if (tags !== undefined) updateData.tags = JSON.stringify(Array.isArray(tags) ? tags : []);

    const updated = await prisma.galleryImage.update({
      where: { id },
      data: updateData,
    });

    await logActivity({
      req,
      action: 'UPDATE',
      module: 'GALLERY',
      description: `Updated gallery image "${updated.title}"`,
      metadata: { imageId: updated.id, title: updated.title },
    });

    res.json({ success: true, message: 'Gallery image updated', image: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update gallery image' });
  }
};

export const deleteGalleryImage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.galleryImage.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Gallery image not found' });
      return;
    }

    await prisma.galleryImage.delete({ where: { id } });

    await logActivity({
      req,
      action: 'DELETE',
      module: 'GALLERY',
      description: `Deleted gallery image: "${existing.title}"`,
      metadata: { imageId: id, title: existing.title },
    });

    res.json({ success: true, message: 'Gallery image deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete gallery image' });
  }
};
