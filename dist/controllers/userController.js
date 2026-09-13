"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUserRole = exports.listUsers = void 0;
const prisma_js_1 = __importDefault(require("../utils/prisma.js"));
const activityLogger_js_1 = require("../middleware/activityLogger.js");
const listUsers = async (req, res) => {
    try {
        const { role, search } = req.query;
        const where = {};
        if (role && typeof role === 'string') {
            where.role = role;
        }
        if (search && typeof search === 'string') {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
            ];
        }
        const users = await prisma_js_1.default.user.findMany({
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to list users' });
    }
};
exports.listUsers = listUsers;
const updateUserRole = async (req, res) => {
    try {
        const id = req.params.id;
        const { role } = req.body;
        if (!['ADMIN', 'STAFF', 'CUSTOMER'].includes(String(role))) {
            res.status(400).json({ success: false, message: 'Invalid role specified' });
            return;
        }
        const targetUser = await prisma_js_1.default.user.findUnique({ where: { id } });
        if (!targetUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const updatedUser = await prisma_js_1.default.user.update({
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
        await (0, activityLogger_js_1.logActivity)({
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update user role' });
    }
};
exports.updateUserRole = updateUserRole;
const deleteUser = async (req, res) => {
    try {
        const id = req.params.id;
        if (req.user?.userId === id) {
            res.status(400).json({ success: false, message: 'You cannot delete your own account' });
            return;
        }
        const user = await prisma_js_1.default.user.findUnique({ where: { id } });
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        await prisma_js_1.default.user.delete({ where: { id } });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'DELETE',
            module: 'USERS',
            description: `Deleted user account: ${user.email} (${user.name})`,
            metadata: { deletedUserId: id, email: user.email },
        });
        res.json({ success: true, message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to delete user' });
    }
};
exports.deleteUser = deleteUser;
