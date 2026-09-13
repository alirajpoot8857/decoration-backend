"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteService = exports.updateService = exports.createService = exports.getServiceBySlug = exports.listServices = void 0;
const prisma_js_1 = __importDefault(require("../utils/prisma.js"));
const activityLogger_js_1 = require("../middleware/activityLogger.js");
const listServices = async (req, res) => {
    try {
        const { includeInactive } = req.query;
        const where = {};
        if (includeInactive !== 'true') {
            where.isActive = true;
        }
        const services = await prisma_js_1.default.service.findMany({
            where,
            orderBy: { displayOrder: 'asc' },
        });
        const parsedServices = services.map((s) => ({
            ...s,
            features: typeof s.features === 'string' ? JSON.parse(s.features || '[]') : s.features,
        }));
        res.json({ success: true, count: parsedServices.length, services: parsedServices });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch services' });
    }
};
exports.listServices = listServices;
const getServiceBySlug = async (req, res) => {
    try {
        const slug = req.params.slug;
        const service = await prisma_js_1.default.service.findUnique({
            where: { slug },
        });
        if (!service) {
            res.status(404).json({ success: false, message: 'Service not found' });
            return;
        }
        res.json({
            success: true,
            service: {
                ...service,
                features: typeof service.features === 'string' ? JSON.parse(service.features || '[]') : service.features,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch service' });
    }
};
exports.getServiceBySlug = getServiceBySlug;
const createService = async (req, res) => {
    try {
        const { title, subtitle, description, icon, imageUrl, priceStartingAt, features, displayOrder, isActive } = req.body;
        if (!title || !description || !imageUrl) {
            res.status(400).json({ success: false, message: 'Title, description, and image URL are required' });
            return;
        }
        const slug = `${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
        const service = await prisma_js_1.default.service.create({
            data: {
                title: String(title),
                slug,
                subtitle: subtitle ? String(subtitle) : null,
                description: String(description),
                icon: icon ? String(icon) : null,
                imageUrl: String(imageUrl),
                priceStartingAt: Number(priceStartingAt) || 0,
                features: JSON.stringify(Array.isArray(features) ? features : []),
                displayOrder: Number(displayOrder) || 0,
                isActive: isActive !== undefined ? Boolean(isActive) : true,
            },
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'CREATE',
            module: 'SERVICES',
            description: `Created new service: "${service.title}"`,
            metadata: { serviceId: service.id, title: service.title },
        });
        res.status(201).json({ success: true, message: 'Service created successfully', service });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to create service' });
    }
};
exports.createService = createService;
const updateService = async (req, res) => {
    try {
        const id = req.params.id;
        const { title, subtitle, description, icon, imageUrl, priceStartingAt, features, displayOrder, isActive } = req.body;
        const existing = await prisma_js_1.default.service.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Service not found' });
            return;
        }
        const updateData = {};
        if (title)
            updateData.title = String(title);
        if (subtitle !== undefined)
            updateData.subtitle = subtitle ? String(subtitle) : null;
        if (description)
            updateData.description = String(description);
        if (icon !== undefined)
            updateData.icon = icon ? String(icon) : null;
        if (imageUrl)
            updateData.imageUrl = String(imageUrl);
        if (priceStartingAt !== undefined)
            updateData.priceStartingAt = Number(priceStartingAt);
        if (features !== undefined)
            updateData.features = JSON.stringify(Array.isArray(features) ? features : []);
        if (displayOrder !== undefined)
            updateData.displayOrder = Number(displayOrder);
        if (isActive !== undefined)
            updateData.isActive = Boolean(isActive);
        const updated = await prisma_js_1.default.service.update({
            where: { id },
            data: updateData,
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'UPDATE',
            module: 'SERVICES',
            description: `Updated service: "${updated.title}"`,
            metadata: { serviceId: updated.id, title: updated.title },
        });
        res.json({ success: true, message: 'Service updated successfully', service: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update service' });
    }
};
exports.updateService = updateService;
const deleteService = async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await prisma_js_1.default.service.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Service not found' });
            return;
        }
        await prisma_js_1.default.service.delete({ where: { id } });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'DELETE',
            module: 'SERVICES',
            description: `Deleted service: "${existing.title}"`,
            metadata: { serviceId: id, title: existing.title },
        });
        res.json({ success: true, message: 'Service deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to delete service' });
    }
};
exports.deleteService = deleteService;
