import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access forbidden. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
};

export const requireAdmin = authorize(['ADMIN']);
export const requireStaffOrAdmin = authorize(['ADMIN', 'STAFF']);
export const requireCustomerOrStaffOrAdmin = authorize(['ADMIN', 'STAFF', 'CUSTOMER']);
