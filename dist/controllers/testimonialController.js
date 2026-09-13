"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTestimonial = exports.updateTestimonial = exports.createTestimonial = exports.listTestimonials = void 0;
const prisma_js_1 = __importDefault(require("../utils/prisma.js"));
const activityLogger_js_1 = require("../middleware/activityLogger.js");
const listTestimonials = async (req, res) => {
    try {
        const { includeInactive } = req.query;
        const where = {};
        if (includeInactive !== 'true') {
            where.isActive = true;
        }
        const testimonials = await prisma_js_1.default.testimonial.findMany({
            where,
            orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'desc' }],
        });
        res.json({ success: true, count: testimonials.length, testimonials });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch testimonials' });
    }
};
exports.listTestimonials = listTestimonials;
const createTestimonial = async (req, res) => {
    try {
        const { clientName, clientRole, eventType, comment, rating, avatarUrl, isActive, isFeatured, displayOrder } = req.body;
        if (!clientName || !comment) {
            res.status(400).json({ success: false, message: 'Client name and comment are required' });
            return;
        }
        const testimonial = await prisma_js_1.default.testimonial.create({
            data: {
                clientName: String(clientName),
                clientRole: clientRole ? String(clientRole) : 'Delighted Client',
                eventType: eventType ? String(eventType) : 'Luxury Event',
                comment: String(comment),
                rating: Number(rating) || 5,
                avatarUrl: avatarUrl ? String(avatarUrl) : null,
                isActive: isActive !== undefined ? Boolean(isActive) : true,
                isFeatured: Boolean(isFeatured),
                displayOrder: Number(displayOrder) || 0,
            },
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'CREATE',
            module: 'TESTIMONIALS',
            description: `Added testimonial from "${testimonial.clientName}"`,
            metadata: { testimonialId: testimonial.id, clientName: testimonial.clientName },
        });
        res.status(201).json({ success: true, message: 'Testimonial created successfully', testimonial });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to create testimonial' });
    }
};
exports.createTestimonial = createTestimonial;
const updateTestimonial = async (req, res) => {
    try {
        const id = req.params.id;
        const { clientName, clientRole, eventType, comment, rating, avatarUrl, isActive, isFeatured, displayOrder } = req.body;
        const existing = await prisma_js_1.default.testimonial.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Testimonial not found' });
            return;
        }
        const updateData = {};
        if (clientName)
            updateData.clientName = String(clientName);
        if (clientRole !== undefined)
            updateData.clientRole = clientRole ? String(clientRole) : 'Delighted Client';
        if (eventType !== undefined)
            updateData.eventType = eventType ? String(eventType) : 'Luxury Event';
        if (comment)
            updateData.comment = String(comment);
        if (rating !== undefined)
            updateData.rating = Number(rating);
        if (avatarUrl !== undefined)
            updateData.avatarUrl = avatarUrl ? String(avatarUrl) : null;
        if (isActive !== undefined)
            updateData.isActive = Boolean(isActive);
        if (isFeatured !== undefined)
            updateData.isFeatured = Boolean(isFeatured);
        if (displayOrder !== undefined)
            updateData.displayOrder = Number(displayOrder);
        const updated = await prisma_js_1.default.testimonial.update({
            where: { id },
            data: updateData,
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'UPDATE',
            module: 'TESTIMONIALS',
            description: `Updated testimonial from "${updated.clientName}"`,
            metadata: { testimonialId: updated.id, clientName: updated.clientName },
        });
        res.json({ success: true, message: 'Testimonial updated successfully', testimonial: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update testimonial' });
    }
};
exports.updateTestimonial = updateTestimonial;
const deleteTestimonial = async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await prisma_js_1.default.testimonial.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Testimonial not found' });
            return;
        }
        await prisma_js_1.default.testimonial.delete({ where: { id } });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'DELETE',
            module: 'TESTIMONIALS',
            description: `Deleted testimonial from: "${existing.clientName}"`,
            metadata: { testimonialId: id, clientName: existing.clientName },
        });
        res.json({ success: true, message: 'Testimonial deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to delete testimonial' });
    }
};
exports.deleteTestimonial = deleteTestimonial;
