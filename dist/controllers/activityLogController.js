"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listActivityLogs = void 0;
const prisma_js_1 = __importDefault(require("../utils/prisma.js"));
const listActivityLogs = async (req, res) => {
    try {
        const { module, action, userRole, search, startDate, endDate, limit, page } = req.query;
        const where = {};
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
            if (startDate)
                where.createdAt.gte = new Date(startDate);
            if (endDate)
                where.createdAt.lte = new Date(endDate);
        }
        const take = Math.min(100, Math.max(1, Number(limit) || 50));
        const skip = Math.max(0, ((Number(page) || 1) - 1) * take);
        const [total, logs] = await Promise.all([
            prisma_js_1.default.activityLog.count({ where }),
            prisma_js_1.default.activityLog.findMany({
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to list activity logs' });
    }
};
exports.listActivityLogs = listActivityLogs;
