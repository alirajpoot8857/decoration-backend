"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCustomer = exports.updateCustomer = exports.createCustomer = exports.getCustomer = exports.listCustomers = void 0;
const prisma_js_1 = __importDefault(require("../utils/prisma.js"));
const activityLogger_js_1 = require("../middleware/activityLogger.js");
const listCustomers = async (req, res) => {
    try {
        const { search } = req.query;
        const where = {};
        if (search && typeof search === 'string') {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
            ];
        }
        const customers = await prisma_js_1.default.customer.findMany({
            where,
            include: {
                _count: {
                    select: {
                        bookings: true,
                        rentalRequests: true,
                        sales: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, count: customers.length, customers });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to list customers' });
    }
};
exports.listCustomers = listCustomers;
const getCustomer = async (req, res) => {
    try {
        const id = req.params.id;
        const customer = await prisma_js_1.default.customer.findUnique({
            where: { id },
            include: {
                bookings: { orderBy: { eventDate: 'desc' } },
                rentalRequests: { orderBy: { createdAt: 'desc' } },
                sales: { orderBy: { saleDate: 'desc' } },
            },
        });
        if (!customer) {
            res.status(404).json({ success: false, message: 'Customer not found' });
            return;
        }
        res.json({ success: true, customer });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to get customer' });
    }
};
exports.getCustomer = getCustomer;
const createCustomer = async (req, res) => {
    try {
        const { name, email, phone, address, notes } = req.body;
        if (!name || !email) {
            res.status(400).json({ success: false, message: 'Name and email are required' });
            return;
        }
        const existing = await prisma_js_1.default.customer.findUnique({ where: { email: String(email).toLowerCase() } });
        if (existing) {
            res.status(400).json({ success: false, message: 'Customer with this email already exists' });
            return;
        }
        const customer = await prisma_js_1.default.customer.create({
            data: {
                name: String(name),
                email: String(email).toLowerCase(),
                phone: phone ? String(phone) : null,
                address: address ? String(address) : null,
                notes: notes ? String(notes) : null,
            },
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'CREATE',
            module: 'CUSTOMERS',
            description: `Created customer record for ${customer.name} (${customer.email})`,
            metadata: { customerId: customer.id, email: customer.email },
        });
        res.status(201).json({ success: true, message: 'Customer created successfully', customer });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to create customer' });
    }
};
exports.createCustomer = createCustomer;
const updateCustomer = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, phone, address, notes } = req.body;
        const existing = await prisma_js_1.default.customer.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Customer not found' });
            return;
        }
        const updated = await prisma_js_1.default.customer.update({
            where: { id },
            data: {
                name: name ? String(name) : existing.name,
                phone: phone !== undefined ? (phone ? String(phone) : null) : existing.phone,
                address: address !== undefined ? (address ? String(address) : null) : existing.address,
                notes: notes !== undefined ? (notes ? String(notes) : null) : existing.notes,
            },
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'UPDATE',
            module: 'CUSTOMERS',
            description: `Updated customer record for ${updated.name}`,
            metadata: { customerId: updated.id },
        });
        res.json({ success: true, message: 'Customer updated successfully', customer: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update customer' });
    }
};
exports.updateCustomer = updateCustomer;
const deleteCustomer = async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await prisma_js_1.default.customer.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Customer not found' });
            return;
        }
        await prisma_js_1.default.customer.delete({ where: { id } });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'DELETE',
            module: 'CUSTOMERS',
            description: `Deleted customer record: ${existing.name} (${existing.email})`,
            metadata: { customerId: id, email: existing.email },
        });
        res.json({ success: true, message: 'Customer deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to delete customer' });
    }
};
exports.deleteCustomer = deleteCustomer;
