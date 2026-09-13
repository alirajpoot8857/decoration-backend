"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCustomerOrStaffOrAdmin = exports.requireStaffOrAdmin = exports.requireAdmin = exports.authorize = void 0;
const authorize = (allowedRoles) => {
    return (req, res, next) => {
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
exports.authorize = authorize;
exports.requireAdmin = (0, exports.authorize)(['ADMIN']);
exports.requireStaffOrAdmin = (0, exports.authorize)(['ADMIN', 'STAFF']);
exports.requireCustomerOrStaffOrAdmin = (0, exports.authorize)(['ADMIN', 'STAFF', 'CUSTOMER']);
