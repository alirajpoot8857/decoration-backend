"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePurchase = exports.updatePurchaseStatus = exports.createPurchase = exports.getPurchase = exports.listPurchases = void 0;
const prisma_js_1 = __importDefault(require("../utils/prisma.js"));
const activityLogger_js_1 = require("../middleware/activityLogger.js");
const listPurchases = async (req, res) => {
    try {
        const { paymentStatus, search, startDate, endDate } = req.query;
        const where = {};
        if (paymentStatus && typeof paymentStatus === 'string' && paymentStatus !== 'All') {
            where.paymentStatus = paymentStatus;
        }
        if (search && typeof search === 'string') {
            where.OR = [
                { purchaseNumber: { contains: search } },
                { supplierName: { contains: search } },
            ];
        }
        if (startDate || endDate) {
            where.purchaseDate = {};
            if (startDate && typeof startDate === 'string')
                where.purchaseDate.gte = new Date(startDate);
            if (endDate && typeof endDate === 'string')
                where.purchaseDate.lte = new Date(endDate);
        }
        const purchases = await prisma_js_1.default.purchase.findMany({
            where,
            include: {
                items: { include: { inventory: true } },
            },
            orderBy: { purchaseDate: 'desc' },
        });
        const totalExpense = purchases.reduce((sum, p) => (p.paymentStatus === 'PAID' ? sum + p.total : sum), 0);
        res.json({ success: true, count: purchases.length, totalExpense, purchases });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to list purchases' });
    }
};
exports.listPurchases = listPurchases;
const getPurchase = async (req, res) => {
    try {
        const id = req.params.id;
        const purchase = await prisma_js_1.default.purchase.findUnique({
            where: { id },
            include: {
                items: { include: { inventory: true } },
            },
        });
        if (!purchase) {
            res.status(404).json({ success: false, message: 'Purchase not found' });
            return;
        }
        res.json({ success: true, purchase });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to get purchase' });
    }
};
exports.getPurchase = getPurchase;
const createPurchase = async (req, res) => {
    try {
        const { supplierName, supplierContact, items, tax, paymentStatus, purchaseDate, notes, } = req.body;
        if (!supplierName || !items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({ success: false, message: 'Supplier name and at least one item are required' });
            return;
        }
        let subtotal = 0;
        const validatedItems = [];
        for (const item of items) {
            const qty = Number(item.quantity) || 1;
            const unitCost = Number(item.unitCost) || 0;
            const itemTotal = qty * unitCost;
            subtotal += itemTotal;
            validatedItems.push({
                inventoryId: item.inventoryId ? String(item.inventoryId) : null,
                itemName: item.itemName ? String(item.itemName) : 'Inventory Supply',
                quantity: qty,
                unitCost,
                total: itemTotal,
            });
        }
        const tx = Number(tax) || 0;
        const total = subtotal + tx;
        const purchaseNumber = `PO-${Date.now().toString().slice(-6)}`;
        const purchase = await prisma_js_1.default.purchase.create({
            data: {
                purchaseNumber,
                supplierName: String(supplierName),
                supplierContact: supplierContact ? String(supplierContact) : null,
                subtotal,
                tax: tx,
                total,
                paymentStatus: paymentStatus ? String(paymentStatus) : 'PAID',
                purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
                notes: notes ? String(notes) : null,
                items: {
                    create: validatedItems,
                },
            },
            include: {
                items: true,
            },
        });
        // Auto-increment inventory stock
        for (const item of validatedItems) {
            if (item.inventoryId) {
                const inv = await prisma_js_1.default.inventory.findUnique({ where: { id: item.inventoryId } });
                if (inv) {
                    const newQty = inv.quantity + item.quantity;
                    const newAvail = inv.availableQuantity + item.quantity;
                    await prisma_js_1.default.inventory.update({
                        where: { id: item.inventoryId },
                        data: {
                            quantity: newQty,
                            availableQuantity: newAvail,
                            purchaseCost: item.unitCost || inv.purchaseCost,
                            status: newAvail <= 0 ? 'OUT_OF_STOCK' : newAvail <= inv.minThreshold ? 'LOW_STOCK' : 'IN_STOCK',
                            lastRestockedAt: new Date(),
                        },
                    });
                }
            }
        }
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'CREATE',
            module: 'PURCHASES',
            description: `Created Purchase Order #${purchase.purchaseNumber} from ${supplierName} ($${total.toFixed(2)})`,
            metadata: { purchaseId: purchase.id, purchaseNumber, total, itemsCount: validatedItems.length },
        });
        res.status(201).json({ success: true, message: 'Purchase order created successfully', purchase });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to create purchase' });
    }
};
exports.createPurchase = createPurchase;
const updatePurchaseStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const { paymentStatus, notes } = req.body;
        const existing = await prisma_js_1.default.purchase.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Purchase not found' });
            return;
        }
        const updated = await prisma_js_1.default.purchase.update({
            where: { id },
            data: {
                paymentStatus: paymentStatus ? String(paymentStatus) : existing.paymentStatus,
                notes: notes !== undefined ? (notes ? String(notes) : null) : existing.notes,
            },
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'UPDATE',
            module: 'PURCHASES',
            description: `Updated payment status for PO #${existing.purchaseNumber} to ${updated.paymentStatus}`,
            metadata: { purchaseId: id, oldStatus: existing.paymentStatus, newStatus: updated.paymentStatus },
        });
        res.json({ success: true, message: 'Purchase updated successfully', purchase: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update purchase' });
    }
};
exports.updatePurchaseStatus = updatePurchaseStatus;
const deletePurchase = async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await prisma_js_1.default.purchase.findUnique({ where: { id }, include: { items: true } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Purchase not found' });
            return;
        }
        await prisma_js_1.default.purchaseItem.deleteMany({ where: { purchaseId: id } });
        await prisma_js_1.default.purchase.delete({ where: { id } });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'DELETE',
            module: 'PURCHASES',
            description: `Deleted Purchase Order #${existing.purchaseNumber}`,
            metadata: { purchaseId: id, purchaseNumber: existing.purchaseNumber },
        });
        res.json({ success: true, message: 'Purchase order deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to delete purchase' });
    }
};
exports.deletePurchase = deletePurchase;
