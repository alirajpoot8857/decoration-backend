"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteInquiry = exports.updateInquiryStatus = exports.listInquiries = exports.submitInquiry = void 0;
const prisma_js_1 = __importDefault(require("../utils/prisma.js"));
const activityLogger_js_1 = require("../middleware/activityLogger.js");
const notificationService_js_1 = require("../utils/notificationService.js");
const validation_js_1 = require("../utils/validation.js");
const submitInquiry = async (req, res) => {
    try {
        const { name, email, phone, eventType, eventDate, message } = req.body;
        if (!name || !email || !message) {
            res.status(400).json({ success: false, message: 'Name, email, and message are required' });
            return;
        }
        if (phone && !(0, validation_js_1.isValidPakistaniPhone)(phone)) {
            res.status(400).json({
                success: false,
                message: 'Please provide a valid Pakistani phone number (e.g. 03140660985 or +923140660985)',
            });
            return;
        }
        const inquiry = await prisma_js_1.default.contactInquiry.create({
            data: {
                name: String(name),
                email: String(email).toLowerCase(),
                phone: phone ? String(phone) : null,
                eventType: eventType ? String(eventType) : null,
                eventDate: eventDate ? String(eventDate) : null,
                message: String(message),
                status: 'NEW',
            },
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'INQUIRY_SUBMITTED',
            module: 'CONTACT',
            description: `New contact inquiry received from ${inquiry.name} (${inquiry.email})`,
            metadata: { inquiryId: inquiry.id, name: inquiry.name, email: inquiry.email },
        });
        const notificationPayload = {
            orderType: 'INQUIRY',
            referenceNumber: `INQ-${inquiry.id.slice(-6).toUpperCase()}`,
            customerName: String(name),
            customerEmail: String(email),
            customerPhone: phone ? String(phone) : 'N/A',
            location: eventType ? `Event Type: ${eventType}` : undefined,
            eventDate: eventDate ? String(eventDate) : undefined,
            totalAmount: 0,
            notes: String(message),
        };
        (0, notificationService_js_1.sendOrderEmailNotification)(notificationPayload).catch((e) => console.warn('Email dispatch error:', e));
        (0, notificationService_js_1.sendWhatsAppNotification)(notificationPayload).catch((e) => console.warn('WA dispatch error:', e));
        res.status(201).json({
            success: true,
            message: 'Your inquiry has been received. Our luxury events team will contact you shortly.',
            inquiry,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to submit inquiry' });
    }
};
exports.submitInquiry = submitInquiry;
const listInquiries = async (req, res) => {
    try {
        const { status, search } = req.query;
        const where = {};
        if (status && typeof status === 'string' && status !== 'All') {
            where.status = status;
        }
        if (search && typeof search === 'string') {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { message: { contains: search } },
            ];
        }
        const inquiries = await prisma_js_1.default.contactInquiry.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, count: inquiries.length, inquiries });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to list inquiries' });
    }
};
exports.listInquiries = listInquiries;
const updateInquiryStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const { status, internalNotes } = req.body;
        const existing = await prisma_js_1.default.contactInquiry.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Inquiry not found' });
            return;
        }
        const updateData = {};
        if (status)
            updateData.status = String(status);
        if (internalNotes !== undefined)
            updateData.internalNotes = internalNotes ? String(internalNotes) : null;
        const updated = await prisma_js_1.default.contactInquiry.update({
            where: { id },
            data: updateData,
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'UPDATE',
            module: 'CONTACT',
            description: `Updated inquiry from ${existing.name} to status "${updated.status}"`,
            metadata: { inquiryId: id, oldStatus: existing.status, newStatus: updated.status },
        });
        res.json({ success: true, message: 'Inquiry updated successfully', inquiry: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update inquiry' });
    }
};
exports.updateInquiryStatus = updateInquiryStatus;
const deleteInquiry = async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await prisma_js_1.default.contactInquiry.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Inquiry not found' });
            return;
        }
        await prisma_js_1.default.contactInquiry.delete({ where: { id } });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'DELETE',
            module: 'CONTACT',
            description: `Deleted inquiry from: "${existing.name}"`,
            metadata: { inquiryId: id, email: existing.email },
        });
        res.json({ success: true, message: 'Inquiry deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to delete inquiry' });
    }
};
exports.deleteInquiry = deleteInquiry;
