"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePackage = exports.updatePackage = exports.createPackage = exports.getPackageBySlug = exports.listPackages = void 0;
const prisma_js_1 = __importDefault(require("../utils/prisma.js"));
const activityLogger_js_1 = require("../middleware/activityLogger.js");
const listPackages = async (req, res) => {
    try {
        const { includeInactive } = req.query;
        const where = {};
        if (includeInactive !== 'true') {
            where.isActive = true;
        }
        const packages = await prisma_js_1.default.package.findMany({
            where,
            orderBy: { displayOrder: 'asc' },
        });
        const parsedPackages = packages.map((pkg) => ({
            ...pkg,
            features: typeof pkg.features === 'string' ? JSON.parse(pkg.features || '[]') : pkg.features,
        }));
        res.json({ success: true, count: parsedPackages.length, packages: parsedPackages });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch packages' });
    }
};
exports.listPackages = listPackages;
const getPackageBySlug = async (req, res) => {
    try {
        const slug = req.params.slug;
        const pkg = await prisma_js_1.default.package.findUnique({
            where: { slug },
        });
        if (!pkg) {
            res.status(404).json({ success: false, message: 'Package not found' });
            return;
        }
        res.json({
            success: true,
            package: {
                ...pkg,
                features: typeof pkg.features === 'string' ? JSON.parse(pkg.features || '[]') : pkg.features,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch package' });
    }
};
exports.getPackageBySlug = getPackageBySlug;
const createPackage = async (req, res) => {
    try {
        const { name, tier, tagline, description, price, duration, guestCapacity, features, isRecommended, isActive, displayOrder, imageUrl } = req.body;
        if (!name || !description || price === undefined) {
            res.status(400).json({ success: false, message: 'Name, description, and price are required' });
            return;
        }
        const slug = `${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
        const pkg = await prisma_js_1.default.package.create({
            data: {
                name: String(name),
                slug,
                tier: tier ? String(tier) : 'SIGNATURE',
                tagline: tagline ? String(tagline) : '',
                description: String(description),
                price: Number(price),
                duration: duration ? String(duration) : null,
                guestCapacity: guestCapacity ? String(guestCapacity) : null,
                features: JSON.stringify(Array.isArray(features) ? features : []),
                isRecommended: Boolean(isRecommended),
                isActive: isActive !== undefined ? Boolean(isActive) : true,
                displayOrder: Number(displayOrder) || 0,
                imageUrl: imageUrl ? String(imageUrl) : null,
            },
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'CREATE',
            module: 'PACKAGES',
            description: `Created new package: "${pkg.name}" (${pkg.tier}) at $${pkg.price}`,
            metadata: { packageId: pkg.id, name: pkg.name, price: pkg.price },
        });
        res.status(201).json({ success: true, message: 'Package created successfully', package: pkg });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to create package' });
    }
};
exports.createPackage = createPackage;
const updatePackage = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, tier, tagline, description, price, duration, guestCapacity, features, isRecommended, isActive, displayOrder, imageUrl } = req.body;
        const existing = await prisma_js_1.default.package.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Package not found' });
            return;
        }
        const updateData = {};
        if (name)
            updateData.name = String(name);
        if (tier)
            updateData.tier = String(tier);
        if (tagline !== undefined)
            updateData.tagline = tagline ? String(tagline) : '';
        if (description)
            updateData.description = String(description);
        if (duration !== undefined)
            updateData.duration = duration ? String(duration) : null;
        if (guestCapacity !== undefined)
            updateData.guestCapacity = guestCapacity ? String(guestCapacity) : null;
        if (features !== undefined)
            updateData.features = JSON.stringify(Array.isArray(features) ? features : []);
        if (isRecommended !== undefined)
            updateData.isRecommended = Boolean(isRecommended);
        if (isActive !== undefined)
            updateData.isActive = Boolean(isActive);
        if (displayOrder !== undefined)
            updateData.displayOrder = Number(displayOrder);
        if (imageUrl !== undefined)
            updateData.imageUrl = imageUrl ? String(imageUrl) : null;
        let priceChanged = false;
        let oldPrice = existing.price;
        if (price !== undefined && Number(price) !== existing.price) {
            updateData.price = Number(price);
            priceChanged = true;
        }
        const updated = await prisma_js_1.default.package.update({
            where: { id },
            data: updateData,
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: priceChanged ? 'PRICE_CHANGE' : 'UPDATE',
            module: 'PACKAGES',
            description: priceChanged
                ? `Changed price for package "${updated.name}" from $${oldPrice} to $${updated.price}`
                : `Updated package details for "${updated.name}"`,
            metadata: { packageId: updated.id, oldPrice, newPrice: updated.price },
        });
        res.json({ success: true, message: 'Package updated successfully', package: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update package' });
    }
};
exports.updatePackage = updatePackage;
const deletePackage = async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await prisma_js_1.default.package.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Package not found' });
            return;
        }
        await prisma_js_1.default.package.delete({ where: { id } });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'DELETE',
            module: 'PACKAGES',
            description: `Deleted package: "${existing.name}"`,
            metadata: { packageId: id, name: existing.name },
        });
        res.json({ success: true, message: 'Package deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to delete package' });
    }
};
exports.deletePackage = deletePackage;
