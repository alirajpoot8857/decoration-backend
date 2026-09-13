import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';
import { logActivity } from '../middleware/activityLogger.js';

export const listUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { role, search } = req.query;
    const where: any = {};

    if (role && typeof role === 'string') {
      where.role = role;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: users.length, users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to list users' });
  }
};

export const updateUserRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (!['ADMIN', 'STAFF', 'CUSTOMER'].includes(String(role))) {
      res.status(400).json({ success: false, message: 'Invalid role specified' });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: String(role) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    await logActivity({
      req,
      action: 'UPDATE_ROLE',
      module: 'USERS',
      description: `Admin changed role for ${targetUser.email} from ${targetUser.role} to ${role}`,
      metadata: { targetUserId: id, oldRole: targetUser.role, newRole: role },
    });

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update user role' });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (req.user?.userId === id) {
      res.status(400).json({ success: false, message: 'You cannot delete your own account' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    await logActivity({
      req,
      action: 'DELETE',
      module: 'USERS',
      description: `Deleted user account: ${user.email} (${user.name})`,
      metadata: { deletedUserId: id, email: user.email },
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete user' });
  }
};
