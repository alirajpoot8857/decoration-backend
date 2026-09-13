"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getMe = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const prisma_js_1 = __importDefault(require("../utils/prisma.js"));
const jwt_js_1 = require("../utils/jwt.js");
const activityLogger_js_1 = require("../middleware/activityLogger.js");
const validation_js_1 = require("../utils/validation.js");
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    phone: zod_1.z.string().optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
const register = async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);
        if (validatedData.phone && !(0, validation_js_1.isValidPakistaniPhone)(validatedData.phone)) {
            res.status(400).json({
                success: false,
                message: 'Please provide a valid Pakistani phone number (e.g. 03140660985 or +923140660985)',
            });
            return;
        }
        const existingUser = await prisma_js_1.default.user.findUnique({
            where: { email: validatedData.email.toLowerCase() },
        });
        if (existingUser) {
            res.status(400).json({ success: false, message: 'Email already in use' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(validatedData.password, 10);
        const user = await prisma_js_1.default.user.create({
            data: {
                name: validatedData.name,
                email: validatedData.email.toLowerCase(),
                password: hashedPassword,
                phone: validatedData.phone,
                role: 'CUSTOMER',
            },
        });
        // Create or link customer record
        await prisma_js_1.default.customer.upsert({
            where: { email: user.email },
            update: { userId: user.id, name: user.name, phone: user.phone },
            create: {
                userId: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
            },
        });
        const token = (0, jwt_js_1.generateToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            action: 'REGISTER',
            module: 'AUTH',
            description: `New customer account registered: ${user.email}`,
        });
        res.status(201).json({
            success: true,
            message: 'Account registered successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.errors ? error.errors[0].message : error.message || 'Registration failed',
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const validatedData = loginSchema.parse(req.body);
        const user = await prisma_js_1.default.user.findUnique({
            where: { email: validatedData.email.toLowerCase() },
        });
        if (!user) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(validatedData.password, user.password);
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }
        const token = (0, jwt_js_1.generateToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            action: 'LOGIN',
            module: 'AUTH',
            description: `User logged in: ${user.email} (${user.role})`,
        });
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatarUrl: user.avatarUrl,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.errors ? error.errors[0].message : error.message || 'Login failed',
        });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const user = await prisma_js_1.default.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                avatarUrl: true,
                createdAt: true,
            },
        });
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch user' });
    }
};
exports.getMe = getMe;
const updateProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const { name, phone, avatarUrl, currentPassword, newPassword } = req.body;
        const user = await prisma_js_1.default.user.findUnique({
            where: { id: req.user.userId },
        });
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const updateData = {};
        if (name)
            updateData.name = name;
        if (phone !== undefined)
            updateData.phone = phone;
        if (avatarUrl !== undefined)
            updateData.avatarUrl = avatarUrl;
        if (newPassword) {
            if (!currentPassword) {
                res.status(400).json({ success: false, message: 'Current password is required to set a new password' });
                return;
            }
            const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
            if (!isMatch) {
                res.status(400).json({ success: false, message: 'Incorrect current password' });
                return;
            }
            updateData.password = await bcryptjs_1.default.hash(newPassword, 10);
        }
        const updatedUser = await prisma_js_1.default.user.update({
            where: { id: user.id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                avatarUrl: true,
                createdAt: true,
            },
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'UPDATE_PROFILE',
            module: 'AUTH',
            description: `User ${user.email} updated profile settings`,
        });
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update profile' });
    }
};
exports.updateProfile = updateProfile;
