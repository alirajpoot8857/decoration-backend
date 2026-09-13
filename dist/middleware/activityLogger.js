"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = void 0;
const prisma_js_1 = __importDefault(require("../utils/prisma.js"));
const logActivity = async (params) => {
    try {
        let userId = params.userId;
        let userName = params.userName;
        let userRole = params.userRole;
        let ipAddress = undefined;
        let userAgent = undefined;
        if (params.req) {
            const authReq = params.req;
            if (authReq.user) {
                userId = userId || authReq.user.userId;
                userName = userName || authReq.user.name;
                userRole = userRole || authReq.user.role;
            }
            ipAddress = params.req.headers['x-forwarded-for'] || params.req.socket?.remoteAddress;
            userAgent = params.req.headers['user-agent'];
        }
        // Filter sensitive fields like passwords from metadata
        let metadataJson = null;
        if (params.metadata) {
            const sanitized = { ...params.metadata };
            if (sanitized.password)
                delete sanitized.password;
            if (sanitized.token)
                delete sanitized.token;
            metadataJson = JSON.stringify(sanitized);
        }
        await prisma_js_1.default.activityLog.create({
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
    }
    catch (error) {
        console.error('Failed to record activity log:', error);
    }
};
exports.logActivity = logActivity;
