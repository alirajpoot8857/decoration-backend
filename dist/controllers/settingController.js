"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestEmail = exports.bulkUpdateSettings = exports.updateSetting = exports.listSettings = void 0;
const prisma_js_1 = __importDefault(require("../utils/prisma.js"));
const activityLogger_js_1 = require("../middleware/activityLogger.js");
const listSettings = async (req, res) => {
    try {
        const settings = await prisma_js_1.default.setting.findMany();
        const settingsMap = {};
        settings.forEach((s) => {
            settingsMap[s.key] = s.value;
        });
        res.json({ success: true, settings: settingsMap, raw: settings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to list settings' });
    }
};
exports.listSettings = listSettings;
const updateSetting = async (req, res) => {
    try {
        const key = req.params.key;
        const { value, category, description } = req.body;
        const setting = await prisma_js_1.default.setting.upsert({
            where: { key },
            update: {
                value: String(value),
                category: category ? String(category) : undefined,
                description: description ? String(description) : undefined,
            },
            create: {
                key: String(key),
                value: String(value),
                category: category ? String(category) : 'GENERAL',
                description: description ? String(description) : null,
            },
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'UPDATE_SETTING',
            module: 'SETTINGS',
            description: `Updated setting "${key}"`,
            metadata: { key, value },
        });
        res.json({ success: true, message: `Setting ${key} updated`, setting });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update setting' });
    }
};
exports.updateSetting = updateSetting;
const bulkUpdateSettings = async (req, res) => {
    try {
        const rawSettings = (req.body && req.body.settings) ? req.body.settings : req.body;
        if (!rawSettings || typeof rawSettings !== 'object') {
            res.status(400).json({ success: false, message: 'Settings object required' });
            return;
        }
        const updatedKeys = [];
        for (const [key, value] of Object.entries(rawSettings)) {
            if (value === undefined || value === null || typeof value === 'function')
                continue;
            const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
            await prisma_js_1.default.setting.upsert({
                where: { key },
                update: { value: strVal },
                create: { key, value: strVal, category: 'GENERAL' },
            });
            updatedKeys.push(key);
        }
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'BULK_UPDATE_SETTINGS',
            module: 'SETTINGS',
            description: `Bulk updated system settings (${updatedKeys.length} keys)`,
            metadata: { updatedKeys },
        });
        res.json({ success: true, message: 'Settings updated successfully', updatedCount: updatedKeys.length });
    }
    catch (error) {
        console.error('bulkUpdateSettings error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to update settings' });
    }
};
exports.bulkUpdateSettings = bulkUpdateSettings;
const sendTestEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const targetEmail = email && typeof email === 'string' && email.includes('@') ? email.trim() : undefined;
        const { sendDirectTestEmail } = await import('../utils/notificationService.js');
        const result = await sendDirectTestEmail(targetEmail);
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                previewUrl: result.previewUrl,
                providerName: result.providerName,
                isRealDelivery: result.isRealDelivery,
            });
        }
        else {
            res.status(500).json({ success: false, message: result.message });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to dispatch test email' });
    }
};
exports.sendTestEmail = sendTestEmail;
