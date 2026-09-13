import { Request } from 'express';
import prisma from '../utils/prisma.js';
import { AuthenticatedRequest } from './auth.js';

export interface LogActivityParams {
  req?: Request | AuthenticatedRequest;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  module: string;
  description: string;
  metadata?: any;
}

export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    let userId = params.userId;
    let userName = params.userName;
    let userRole = params.userRole;
    let ipAddress: string | undefined = undefined;
    let userAgent: string | undefined = undefined;

    if (params.req) {
      const authReq = params.req as AuthenticatedRequest;
      if (authReq.user) {
        userId = userId || authReq.user.userId;
        userName = userName || authReq.user.name;
        userRole = userRole || authReq.user.role;
      }
      ipAddress = (params.req.headers['x-forwarded-for'] as string) || params.req.socket?.remoteAddress;
      userAgent = params.req.headers['user-agent'];
    }

    // Filter sensitive fields like passwords from metadata
    let metadataJson: string | null = null;
    if (params.metadata) {
      const sanitized = { ...params.metadata };
      if (sanitized.password) delete sanitized.password;
      if (sanitized.token) delete sanitized.token;
      metadataJson = JSON.stringify(sanitized);
    }

    await prisma.activityLog.create({
      data: {
        userId: userId || null,
        userName: userName || 'System / Guest',
        userRole: userRole || 'GUEST',
        action: params.action,
        module: params.module,
        description: params.description,
        metadataJson,
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'Internal Client',
      },
    });
  } catch (error) {
    console.error('Failed to record activity log:', error);
  }
};
