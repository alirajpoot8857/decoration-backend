import { Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const listActivityLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { module, action, userRole, search, startDate, endDate, limit, page } = req.query;
    const where: any = {};

    if (module && typeof module === 'string' && module !== 'All') {
      where.module = module;
    }

    if (action && typeof action === 'string' && action !== 'All') {
      where.action = action;
    }

    if (userRole && typeof userRole === 'string' && userRole !== 'All') {
      where.userRole = userRole;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { description: { contains: search } },
        { userName: { contains: search } },
        { module: { contains: search } },
        { action: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const take = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = Math.max(0, ((Number(page) || 1) - 1) * take);

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
          },
        },
      }),
    ]);

    const parsedLogs = logs.map((log) => ({
      ...log,
      metadata: log.metadataJson ? JSON.parse(log.metadataJson) : null,
    }));

    res.json({
      success: true,
      total,
      page: Number(page) || 1,
      totalPages: Math.ceil(total / take),
      logs: parsedLogs,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to list activity logs' });
  }
};
