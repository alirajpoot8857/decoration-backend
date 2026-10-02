"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRentalRequest = exports.getRentalSummary = exports.checkRentalAvailability = exports.updateRentalRequestStatus = exports.listRentalRequests = exports.submitRentalRequest = exports.deleteRentalItem = exports.updateRentalItem = exports.createRentalItem = exports.getRentalItem = exports.listRentalItems = void 0;
exports.getReservedQuantityForDates = getReservedQuantityForDates;
const prisma_js_1 = __importDefault(require("../utils/prisma.js"));
const activityLogger_js_1 = require("../middleware/activityLogger.js");
const notificationService_js_1 = require("../utils/notificationService.js");
const validation_js_1 = require("../utils/validation.js");
// Helper to compute overlapping reserved quantity for an item across active rentals
async function getReservedQuantityForDates(itemId, startDateStr, endDateStr, excludeRentalId) {
    try {
        const where = {
            status: { notIn: ['CANCELLED', 'RETURNED'] },
        };
        if (excludeRentalId) {
            where.id = { not: excludeRentalId };
        }
        if (startDateStr && endDateStr) {
            const start = new Date(startDateStr);
            const end = new Date(endDateStr);
            // Overlap condition: rental.eventDate <= requested.returnDate AND rental.returnDate >= requested.eventDate
            where.eventDate = { lte: end };
            where.returnDate = { gte: start };
        }
        const activeRentals = await prisma_js_1.default.rentalRequest.findMany({
            where,
            select: { itemsJson: true },
        });
        let totalReserved = 0;
        for (const rental of activeRentals) {
            const items = typeof rental.itemsJson === 'string' ? JSON.parse(rental.itemsJson || '[]') : rental.itemsJson;
            if (Array.isArray(items)) {
                for (const it of items) {
                    if (it.itemId === itemId || it.id === itemId) {
                        totalReserved += Number(it.quantity) || 0;
                    }
                }
            }
        }
        return totalReserved;
    }
    catch (err) {
        console.error('Error calculating reserved quantity for dates:', err);
        return 0;
    }
}
const listRentalItems = async (req, res) => {
    try {
        const { category, search, includeInactive, eventDate, returnDate } = req.query;
        const where = {};
        if (includeInactive !== 'true') {
            where.isActive = true;
        }
        if (category && typeof category === 'string' && category !== 'All') {
            where.category = category;
        }
        if (search && typeof search === 'string') {
            where.OR = [
                { name: { contains: search } },
                { description: { contains: search } },
                { category: { contains: search } },
            ];
        }
        const items = await prisma_js_1.default.rentalItem.findMany({
            where,
            orderBy: [{ createdAt: 'asc' }],
        });
        // Dynamically calculate availability taking active bookings/dates into consideration
        const computedItems = await Promise.all(items.map(async (item) => {
            let availableQty = item.availableQuantity;
            let rentedQty = item.rentedQuantity;
            if (eventDate && returnDate) {
                const reservedForDate = await getReservedQuantityForDates(item.id, String(eventDate), String(returnDate));
                availableQty = Math.max(0, item.totalQuantity - reservedForDate);
                rentedQty = reservedForDate;
            }
            const status = availableQty <= 0
                ? 'OUT_OF_STOCK'
                : availableQty <= 2
                    ? 'LOW_STOCK'
                    : 'AVAILABLE';
            return {
                ...item,
                availableQuantity: availableQty,
                rentedQuantity: rentedQty,
                status,
            };
        }));
        const totalStock = computedItems.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
        const availableStock = computedItems.reduce((sum, item) => sum + (item.availableQuantity || 0), 0);
        const rentedStock = computedItems.reduce((sum, item) => sum + (item.rentedQuantity || 0), 0);
        const outOfStockCount = computedItems.filter((item) => item.availableQuantity <= 0 || item.status === 'OUT_OF_STOCK').length;
        const lowStockCount = computedItems.filter((item) => item.availableQuantity > 0 && item.availableQuantity <= 2).length;
        const availableCount = computedItems.filter((item) => item.availableQuantity > 0 && item.status !== 'OUT_OF_STOCK').length;
        const summary = {
            totalItems: computedItems.length,
            totalStock,
            availableStock,
            rentedStock,
            outOfStockCount,
            lowStockCount,
            availableCount,
        };
        res.json({ success: true, summary, count: computedItems.length, items: computedItems });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch rental items' });
    }
};
exports.listRentalItems = listRentalItems;
const getRentalItem = async (req, res) => {
    try {
        const id = req.params.id;
        const item = await prisma_js_1.default.rentalItem.findFirst({
            where: { OR: [{ id }, { slug: id }] },
        });
        if (!item) {
            res.status(404).json({ success: false, message: 'Rental item not found' });
            return;
        }
        res.json({ success: true, item });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch item' });
    }
};
exports.getRentalItem = getRentalItem;
const createRentalItem = async (req, res) => {
    try {
        const { name, category, description, imageUrl, rentalPrice, hourlyRate, replacementCost, depositAmount, totalQuantity, dimensions, material, notes, } = req.body;
        if (!name || !category || !imageUrl || rentalPrice === undefined) {
            res.status(400).json({ success: false, message: 'Name, category, image URL, and rental price are required' });
            return;
        }
        const qty = Number(totalQuantity) || 1;
        const price = Number(rentalPrice);
        const hourly = hourlyRate !== undefined && Number(hourlyRate) > 0 ? Number(hourlyRate) : +(price * 0.2).toFixed(2);
        const deposit = depositAmount !== undefined ? Number(depositAmount) : price * 0.3;
        const slug = `${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
        const item = await prisma_js_1.default.rentalItem.create({
            data: {
                name: String(name),
                slug,
                category: String(category),
                description: description ? String(description) : '',
                imageUrl: String(imageUrl),
                rentalPrice: price,
                hourlyRate: hourly,
                replacementCost: Number(replacementCost) || price * 3,
                depositAmount: deposit,
                totalQuantity: qty,
                availableQuantity: qty,
                rentedQuantity: 0,
                status: 'AVAILABLE',
                dimensions: dimensions ? String(dimensions) : null,
                material: material ? String(material) : null,
                notes: notes ? String(notes) : null,
                isActive: true,
            },
        });
        // Also sync/create Inventory record
        const sku = `RENT-${String(name).slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        await prisma_js_1.default.inventory.create({
            data: {
                sku,
                name: `Rental: ${item.name}`,
                category: item.category,
                quantity: qty,
                availableQuantity: qty,
                purchaseCost: Number(replacementCost) || price * 2,
                rentalPrice: price,
                hourlyRate: hourly,
                status: 'IN_STOCK',
                notes: `Auto-linked from Rental Item: ${item.id}`,
            },
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'CREATE',
            module: 'RENTALS',
            description: `Created rental product: "${item.name}" ($${item.rentalPrice}/day, $${item.hourlyRate}/hr, qty: ${qty})`,
            metadata: { itemId: item.id, name: item.name, price: item.rentalPrice, hourlyRate: item.hourlyRate, quantity: qty },
        });
        res.status(201).json({ success: true, message: 'Rental item created successfully', item });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to create rental item' });
    }
};
exports.createRentalItem = createRentalItem;
const updateRentalItem = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, category, description, imageUrl, rentalPrice, hourlyRate, replacementCost, depositAmount, totalQuantity, availableQuantity, status, dimensions, material, notes, isActive, } = req.body;
        const existing = await prisma_js_1.default.rentalItem.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Rental item not found' });
            return;
        }
        const updateData = {};
        if (name)
            updateData.name = String(name);
        if (category)
            updateData.category = String(category);
        if (description !== undefined)
            updateData.description = description ? String(description) : '';
        if (imageUrl)
            updateData.imageUrl = String(imageUrl);
        if (dimensions !== undefined)
            updateData.dimensions = dimensions ? String(dimensions) : null;
        if (material !== undefined)
            updateData.material = material ? String(material) : null;
        if (notes !== undefined)
            updateData.notes = notes ? String(notes) : null;
        if (isActive !== undefined)
            updateData.isActive = Boolean(isActive);
        let priceChanged = false;
        if (rentalPrice !== undefined && Number(rentalPrice) !== existing.rentalPrice) {
            updateData.rentalPrice = Number(rentalPrice);
            priceChanged = true;
        }
        if (hourlyRate !== undefined) {
            updateData.hourlyRate = Number(hourlyRate);
        }
        if (replacementCost !== undefined)
            updateData.replacementCost = Number(replacementCost);
        if (depositAmount !== undefined)
            updateData.depositAmount = Number(depositAmount);
        if (totalQuantity !== undefined) {
            const newTotal = Number(totalQuantity);
            updateData.totalQuantity = newTotal;
            if (availableQuantity === undefined) {
                updateData.availableQuantity = Math.max(0, newTotal - existing.rentedQuantity);
            }
        }
        if (availableQuantity !== undefined) {
            updateData.availableQuantity = Number(availableQuantity);
        }
        if (status) {
            updateData.status = String(status);
        }
        const updated = await prisma_js_1.default.rentalItem.update({
            where: { id },
            data: updateData,
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: priceChanged ? 'PRICE_CHANGE' : 'UPDATE',
            module: 'RENTALS',
            description: priceChanged
                ? `Changed rental price for "${updated.name}" to $${updated.rentalPrice}/day, $${updated.hourlyRate}/hr`
                : `Updated rental item details for "${updated.name}"`,
            metadata: { itemId: updated.id, oldPrice: existing.rentalPrice, newPrice: updated.rentalPrice },
        });
        res.json({ success: true, message: 'Rental item updated successfully', item: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update rental item' });
    }
};
exports.updateRentalItem = updateRentalItem;
const deleteRentalItem = async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await prisma_js_1.default.rentalItem.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Rental item not found' });
            return;
        }
        await prisma_js_1.default.rentalItem.delete({ where: { id } });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'DELETE',
            module: 'RENTALS',
            description: `Deleted rental item: "${existing.name}"`,
            metadata: { itemId: id, name: existing.name },
        });
        res.json({ success: true, message: 'Rental item deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to delete rental item' });
    }
};
exports.deleteRentalItem = deleteRentalItem;
const submitRentalRequest = async (req, res) => {
    try {
        const { customerName, customerEmail, customerPhone, eventDate, returnDate, rentalMode = 'DAILY', // DAILY or HOURLY
        rentalHours = 24, items, discount = 0, notes, } = req.body;
        if (!customerName || !customerEmail || !customerPhone || !eventDate || !returnDate || !items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({ success: false, message: 'Missing required rental request fields or items' });
            return;
        }
        if (!(0, validation_js_1.isValidPakistaniPhone)(customerPhone)) {
            res.status(400).json({
                success: false,
                message: 'Please provide a valid Pakistani phone number (e.g. 03140660985 or +923140660985)',
            });
            return;
        }
        const todayDateStr = new Date().toISOString().split('T')[0];
        const eventDateOnly = String(eventDate).split('T')[0];
        const returnDateOnly = String(returnDate).split('T')[0];
        if (eventDateOnly < todayDateStr) {
            res.status(400).json({ success: false, message: 'Event start date cannot be in the past' });
            return;
        }
        if (returnDateOnly < eventDateOnly) {
            res.status(400).json({ success: false, message: 'Return date cannot be earlier than event start date' });
            return;
        }
        let subtotal = 0;
        let totalDeposit = 0;
        const validatedItems = [];
        // Calculate days duration for Daily mode (without Math.abs)
        const start = new Date(eventDate);
        const end = new Date(returnDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() < start.getTime()) {
            res.status(400).json({ success: false, message: 'Invalid event or return date provided' });
            return;
        }
        const diffMs = end.getTime() - start.getTime();
        const daysCount = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const isHourly = rentalMode === 'HOURLY';
        const hours = Math.max(1, Number(rentalHours) || 4);
        for (const itemReq of items) {
            const dbItem = await prisma_js_1.default.rentalItem.findUnique({ where: { id: String(itemReq.itemId) } });
            if (!dbItem) {
                res.status(400).json({ success: false, message: `Rental item ${itemReq.itemId} not found` });
                return;
            }
            const reqQty = Number(itemReq.quantity) || 1;
            // 1. Check date-range availability taking active rentals into account
            const reservedForDate = await getReservedQuantityForDates(dbItem.id, String(eventDate), String(returnDate));
            const availableForRange = Math.max(0, dbItem.totalQuantity - reservedForDate);
            if (reqQty > availableForRange || reqQty > dbItem.availableQuantity) {
                const effectiveAvail = Math.min(availableForRange, dbItem.availableQuantity);
                res.status(400).json({
                    success: false,
                    message: effectiveAvail <= 0
                        ? `"${dbItem.name}" is currently Out of Stock for the selected dates.`
                        : `Requested quantity (${reqQty}) for "${dbItem.name}" exceeds available stock (${effectiveAvail} available for these dates).`,
                });
                return;
            }
            // Calculate unit item rate based on mode
            const unitRate = isHourly
                ? +((dbItem.hourlyRate > 0 ? dbItem.hourlyRate : dbItem.rentalPrice * 0.2) * hours).toFixed(2)
                : +(dbItem.rentalPrice * daysCount).toFixed(2);
            const itemTotal = +(unitRate * reqQty).toFixed(2);
            const itemDeposit = +(((dbItem.depositAmount !== null && dbItem.depositAmount !== undefined) ? dbItem.depositAmount : dbItem.rentalPrice * 0.3) * reqQty).toFixed(2);
            subtotal = +(subtotal + itemTotal).toFixed(2);
            totalDeposit = +(totalDeposit + itemDeposit).toFixed(2);
            validatedItems.push({
                itemId: dbItem.id,
                name: dbItem.name,
                category: dbItem.category,
                quantity: reqQty,
                rentalMode: isHourly ? 'HOURLY' : 'DAILY',
                rentalHours: isHourly ? hours : undefined,
                unitRate,
                rentalPrice: dbItem.rentalPrice,
                hourlyRate: dbItem.hourlyRate,
                depositAmount: dbItem.depositAmount,
                imageUrl: dbItem.imageUrl,
                total: itemTotal,
            });
        }
        const discountAmount = Math.max(0, Number(discount) || 0);
        const discountedSubtotal = Math.max(0, +(subtotal - discountAmount).toFixed(2));
        const totalAmount = +(discountedSubtotal + totalDeposit).toFixed(2);
        const rentalNumber = `RENT-${Date.now().toString().slice(-6)}`;
        let customerId = null;
        if (req.user?.userId) {
            const userCustomer = await prisma_js_1.default.customer.findFirst({ where: { userId: req.user.userId } });
            if (userCustomer)
                customerId = userCustomer.id;
        }
        else {
            const existingCust = await prisma_js_1.default.customer.findUnique({ where: { email: String(customerEmail).toLowerCase() } });
            if (existingCust)
                customerId = existingCust.id;
        }
        const rentalRequest = await prisma_js_1.default.rentalRequest.create({
            data: {
                rentalNumber,
                customerId,
                customerName: String(customerName),
                customerEmail: String(customerEmail).toLowerCase(),
                customerPhone: String(customerPhone),
                eventDate: new Date(eventDate),
                returnDate: new Date(returnDate),
                rentalMode: isHourly ? 'HOURLY' : 'DAILY',
                rentalHours: isHourly ? hours : 24,
                status: 'PENDING',
                itemsJson: JSON.stringify(validatedItems),
                discount: discountAmount,
                subtotal,
                deposit: totalDeposit,
                totalAmount,
                notes: notes ? String(notes) : null,
            },
        });
        // 2. Real-Time Stock Decrement & Automatic OUT_OF_STOCK Status Transition
        for (const vItem of validatedItems) {
            const dbItem = await prisma_js_1.default.rentalItem.findUnique({ where: { id: vItem.itemId } });
            if (dbItem) {
                const newAvailable = Math.max(0, dbItem.availableQuantity - vItem.quantity);
                const newRented = dbItem.rentedQuantity + vItem.quantity;
                const newStatus = newAvailable <= 0
                    ? 'OUT_OF_STOCK'
                    : newAvailable <= 2
                        ? 'LOW_STOCK'
                        : 'AVAILABLE';
                await prisma_js_1.default.rentalItem.update({
                    where: { id: dbItem.id },
                    data: {
                        availableQuantity: newAvailable,
                        rentedQuantity: newRented,
                        status: newStatus,
                    },
                });
                // Synchronize corresponding inventory records
                await prisma_js_1.default.inventory.updateMany({
                    where: { name: { contains: dbItem.name } },
                    data: {
                        availableQuantity: newAvailable,
                        status: newAvailable <= 0 ? 'OUT_OF_STOCK' : (newAvailable <= 5 ? 'LOW_STOCK' : 'IN_STOCK'),
                    },
                });
            }
        }
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'CREATE',
            module: 'RENTALS',
            description: `New rental request submitted by ${customerName} (#${rentalNumber}, $${totalAmount.toFixed(2)}, Mode: ${rentalMode})`,
            metadata: { rentalId: rentalRequest.id, rentalNumber, rentalMode, itemsCount: validatedItems.length, discount: discountAmount },
        });
        // Dispatch separate Email and WhatsApp notifications
        const notificationPayload = {
            orderType: 'RENTAL',
            referenceNumber: rentalNumber,
            customerName: String(customerName),
            customerEmail: String(customerEmail),
            customerPhone: String(customerPhone),
            location: notes ? String(notes) : null,
            eventDate: new Date(eventDate),
            returnDate: new Date(returnDate),
            rentalMode: isHourly ? 'HOURLY' : 'DAILY',
            rentalHours: isHourly ? hours : 24,
            items: validatedItems,
            subtotal,
            discount: discountAmount,
            deposit: totalDeposit,
            totalAmount,
            notes: notes ? String(notes) : null,
        };
        // Asynchronously send notifications without blocking client response
        (0, notificationService_js_1.sendOrderEmailNotification)(notificationPayload).catch((e) => console.warn('Email dispatch error:', e));
        const waResult = await (0, notificationService_js_1.sendWhatsAppNotification)(notificationPayload).catch(() => ({ waLink: '' }));
        res.status(201).json({
            success: true,
            message: 'Rental request submitted successfully',
            rentalRequest: {
                ...rentalRequest,
                items: validatedItems,
            },
            waNotificationLink: waResult?.waLink || '',
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to submit rental request' });
    }
};
exports.submitRentalRequest = submitRentalRequest;
const listRentalRequests = async (req, res) => {
    try {
        const { status, search } = req.query;
        const where = {};
        if (req.user?.role === 'CUSTOMER') {
            const customer = await prisma_js_1.default.customer.findFirst({ where: { userId: req.user.userId } });
            where.OR = [
                { customerId: customer?.id || '__none__' },
                { customerEmail: req.user.email.toLowerCase() },
            ];
        }
        if (status && typeof status === 'string' && status !== 'All' && status !== 'undefined' && status !== 'null') {
            where.status = status;
        }
        if (search && typeof search === 'string' && search !== 'undefined' && search !== 'null' && search.trim() !== '') {
            where.OR = [
                { customerName: { contains: search } },
                { customerEmail: { contains: search } },
                { rentalNumber: { contains: search } },
            ];
        }
        const requests = await prisma_js_1.default.rentalRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { customer: true },
        });
        const parsed = requests.map((r) => ({
            ...r,
            items: typeof r.itemsJson === 'string' ? JSON.parse(r.itemsJson || '[]') : r.itemsJson,
        }));
        res.json({ success: true, count: parsed.length, rentalRequests: parsed });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to list rental requests' });
    }
};
exports.listRentalRequests = listRentalRequests;
const updateRentalRequestStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const { status, notes } = req.body;
        const existing = await prisma_js_1.default.rentalRequest.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Rental request not found' });
            return;
        }
        const oldStatus = existing.status;
        const items = JSON.parse(existing.itemsJson || '[]');
        // Active statuses that hold reserved inventory: PENDING, APPROVED, RENTED, CONFIRMED
        const isActiveStatus = (s) => ['PENDING', 'APPROVED', 'RENTED', 'CONFIRMED'].includes(s);
        const isInactiveStatus = (s) => ['CANCELLED', 'RETURNED'].includes(s);
        // 1. Release Inventory when order is CANCELLED or RETURNED
        if (isActiveStatus(oldStatus) && isInactiveStatus(status)) {
            for (const item of items) {
                const dbItem = await prisma_js_1.default.rentalItem.findUnique({ where: { id: item.itemId || item.id } });
                if (dbItem) {
                    const itemQty = Number(item.quantity) || 1;
                    const newAvailable = Math.min(dbItem.totalQuantity, dbItem.availableQuantity + itemQty);
                    const newRented = Math.max(0, dbItem.rentedQuantity - itemQty);
                    const newStatus = newAvailable <= 0
                        ? 'OUT_OF_STOCK'
                        : newAvailable <= 2
                            ? 'LOW_STOCK'
                            : 'AVAILABLE';
                    await prisma_js_1.default.rentalItem.update({
                        where: { id: dbItem.id },
                        data: {
                            availableQuantity: newAvailable,
                            rentedQuantity: newRented,
                            status: newStatus,
                        },
                    });
                    await prisma_js_1.default.inventory.updateMany({
                        where: { name: { contains: dbItem.name } },
                        data: {
                            availableQuantity: newAvailable,
                            status: newAvailable <= 0 ? 'OUT_OF_STOCK' : (newAvailable <= 5 ? 'LOW_STOCK' : 'IN_STOCK'),
                        },
                    });
                }
            }
        }
        // 2. Re-Reserve Inventory if order is reactivated from CANCELLED/RETURNED back to active
        if (isInactiveStatus(oldStatus) && isActiveStatus(status)) {
            for (const item of items) {
                const dbItem = await prisma_js_1.default.rentalItem.findUnique({ where: { id: item.itemId || item.id } });
                if (dbItem) {
                    const itemQty = Number(item.quantity) || 1;
                    const newAvailable = Math.max(0, dbItem.availableQuantity - itemQty);
                    const newRented = dbItem.rentedQuantity + itemQty;
                    const newStatus = newAvailable <= 0
                        ? 'OUT_OF_STOCK'
                        : newAvailable <= 2
                            ? 'LOW_STOCK'
                            : 'AVAILABLE';
                    await prisma_js_1.default.rentalItem.update({
                        where: { id: dbItem.id },
                        data: {
                            availableQuantity: newAvailable,
                            rentedQuantity: newRented,
                            status: newStatus,
                        },
                    });
                    await prisma_js_1.default.inventory.updateMany({
                        where: { name: { contains: dbItem.name } },
                        data: {
                            availableQuantity: newAvailable,
                            status: newAvailable <= 0 ? 'OUT_OF_STOCK' : (newAvailable <= 5 ? 'LOW_STOCK' : 'IN_STOCK'),
                        },
                    });
                }
            }
        }
        const updated = await prisma_js_1.default.rentalRequest.update({
            where: { id },
            data: {
                status: String(status),
                notes: notes !== undefined ? (notes ? String(notes) : null) : existing.notes,
            },
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'STATUS_CHANGE',
            module: 'RENTALS',
            description: `Updated rental request #${existing.rentalNumber} status from ${oldStatus} to ${status}`,
            metadata: { rentalId: existing.id, oldStatus, newStatus: status },
        });
        if (oldStatus !== status) {
            (0, notificationService_js_1.sendStatusChangeEmailNotification)({
                orderType: 'RENTAL',
                referenceNumber: existing.rentalNumber,
                customerName: existing.customerName,
                customerEmail: existing.customerEmail,
                customerPhone: existing.customerPhone,
                newStatus: String(status),
                oldStatus: String(oldStatus),
                totalAmount: existing.totalAmount,
                eventDate: existing.eventDate,
            }).catch((e) => console.warn('Rental status change email error:', e));
        }
        res.json({
            success: true,
            message: `Rental request status updated to ${status}`,
            rentalRequest: {
                ...updated,
                items,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update rental status' });
    }
};
exports.updateRentalRequestStatus = updateRentalRequestStatus;
const checkRentalAvailability = async (req, res) => {
    try {
        const { items, eventDate, returnDate } = req.body;
        if (!items || !Array.isArray(items)) {
            res.status(400).json({ success: false, message: 'Items array is required' });
            return;
        }
        if (eventDate && returnDate) {
            const todayDateStr = new Date().toISOString().split('T')[0];
            const eventDateOnly = String(eventDate).split('T')[0];
            const returnDateOnly = String(returnDate).split('T')[0];
            if (eventDateOnly < todayDateStr) {
                res.status(400).json({ success: false, message: 'Event start date cannot be in the past' });
                return;
            }
            if (returnDateOnly < eventDateOnly) {
                res.status(400).json({ success: false, message: 'Return date cannot be earlier than event start date' });
                return;
            }
        }
        const availabilityResults = await Promise.all(items.map(async (it) => {
            const dbItem = await prisma_js_1.default.rentalItem.findUnique({ where: { id: String(it.itemId) } });
            if (!dbItem) {
                return {
                    itemId: it.itemId,
                    name: 'Unknown Item',
                    requestedQty: it.quantity,
                    availableQty: 0,
                    isAvailable: false,
                    status: 'OUT_OF_STOCK',
                    reason: 'Item does not exist',
                };
            }
            let availableQty = dbItem.availableQuantity;
            if (eventDate && returnDate) {
                const reserved = await getReservedQuantityForDates(dbItem.id, String(eventDate), String(returnDate));
                availableQty = Math.max(0, dbItem.totalQuantity - reserved);
            }
            const requested = Number(it.quantity) || 1;
            const isAvailable = availableQty >= requested && availableQty > 0;
            const status = availableQty <= 0
                ? 'OUT_OF_STOCK'
                : availableQty <= 2
                    ? 'LOW_STOCK'
                    : 'AVAILABLE';
            return {
                itemId: dbItem.id,
                name: dbItem.name,
                requestedQty: requested,
                availableQty,
                isAvailable,
                status,
                reason: isAvailable
                    ? 'In Stock'
                    : availableQty <= 0
                        ? 'Out of Stock for selected dates'
                        : `Insufficient quantity (only ${availableQty} available)`,
            };
        }));
        const allAvailable = availabilityResults.every((r) => r.isAvailable);
        res.json({
            success: true,
            allAvailable,
            items: availabilityResults,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to check availability' });
    }
};
exports.checkRentalAvailability = checkRentalAvailability;
const getRentalSummary = async (req, res) => {
    try {
        const [allItems, allRequests] = await Promise.all([
            prisma_js_1.default.rentalItem.findMany({ where: { isActive: true } }),
            prisma_js_1.default.rentalRequest.findMany({ orderBy: { createdAt: 'desc' } }),
        ]);
        const totalItems = allItems.length;
        const totalStock = allItems.reduce((sum, i) => sum + (i.totalQuantity || 0), 0);
        const availableStock = allItems.reduce((sum, i) => sum + (i.availableQuantity || 0), 0);
        const rentedStock = allItems.reduce((sum, i) => sum + (i.rentedQuantity || 0), 0);
        const outOfStockCount = allItems.filter((i) => i.availableQuantity <= 0 || i.status === 'OUT_OF_STOCK').length;
        const lowStockCount = allItems.filter((i) => i.availableQuantity > 0 && i.availableQuantity <= 2).length;
        const availableCount = allItems.filter((i) => i.availableQuantity > 0 && i.status !== 'OUT_OF_STOCK').length;
        // Rental Orders Breakdown
        const activeRequests = allRequests.filter((r) => ['PENDING', 'APPROVED', 'RENTED', 'CONFIRMED'].includes(r.status));
        const pendingRequests = allRequests.filter((r) => r.status === 'PENDING');
        const approvedRequests = allRequests.filter((r) => r.status === 'APPROVED');
        const rentedRequests = allRequests.filter((r) => r.status === 'RENTED');
        const returnedRequests = allRequests.filter((r) => r.status === 'RETURNED');
        const cancelledRequests = allRequests.filter((r) => r.status === 'CANCELLED');
        // Revenue
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayRequests = allRequests.filter((r) => new Date(r.createdAt) >= startOfToday && r.status !== 'CANCELLED');
        const todayRevenue = todayRequests.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
        const totalRevenue = allRequests.filter((r) => r.status !== 'CANCELLED').reduce((sum, r) => sum + (r.totalAmount || 0), 0);
        // Category Breakdown
        const categoriesMap = {};
        for (const item of allItems) {
            if (!categoriesMap[item.category]) {
                categoriesMap[item.category] = { totalItems: 0, totalStock: 0, availableStock: 0, rentedStock: 0 };
            }
            categoriesMap[item.category].totalItems += 1;
            categoriesMap[item.category].totalStock += item.totalQuantity || 0;
            categoriesMap[item.category].availableStock += item.availableQuantity || 0;
            categoriesMap[item.category].rentedStock += item.rentedQuantity || 0;
        }
        res.json({
            success: true,
            summary: {
                totalItems,
                totalStock,
                availableStock,
                rentedStock,
                outOfStockCount,
                lowStockCount,
                availableCount,
                activeRequestsCount: activeRequests.length,
                pendingRequestsCount: pendingRequests.length,
                approvedRequestsCount: approvedRequests.length,
                rentedRequestsCount: rentedRequests.length,
                returnedRequestsCount: returnedRequests.length,
                cancelledRequestsCount: cancelledRequests.length,
                todayRevenue,
                todayRequestsCount: todayRequests.length,
                totalRevenue,
                totalRequestsCount: allRequests.length,
                categoryBreakdown: categoriesMap,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch rental summary' });
    }
};
exports.getRentalSummary = getRentalSummary;
const deleteRentalRequest = async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await prisma_js_1.default.rentalRequest.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Rental request not found' });
            return;
        }
        // If deleting an active order, restore reserved inventory
        const isActiveStatus = ['PENDING', 'APPROVED', 'RENTED', 'CONFIRMED'].includes(existing.status);
        if (isActiveStatus) {
            const items = typeof existing.itemsJson === 'string' ? JSON.parse(existing.itemsJson || '[]') : (existing.itemsJson || []);
            for (const item of items) {
                const dbItem = await prisma_js_1.default.rentalItem.findUnique({ where: { id: item.itemId || item.id } });
                if (dbItem) {
                    const itemQty = Number(item.quantity) || 1;
                    const newAvailable = Math.min(dbItem.totalQuantity, dbItem.availableQuantity + itemQty);
                    const newRented = Math.max(0, dbItem.rentedQuantity - itemQty);
                    const newStatus = newAvailable <= 0
                        ? 'OUT_OF_STOCK'
                        : newAvailable <= 2
                            ? 'LOW_STOCK'
                            : 'AVAILABLE';
                    await prisma_js_1.default.rentalItem.update({
                        where: { id: dbItem.id },
                        data: {
                            availableQuantity: newAvailable,
                            rentedQuantity: newRented,
                            status: newStatus,
                        },
                    });
                    await prisma_js_1.default.inventory.updateMany({
                        where: { name: { contains: dbItem.name } },
                        data: {
                            availableQuantity: newAvailable,
                            status: newAvailable <= 0 ? 'OUT_OF_STOCK' : (newAvailable <= 5 ? 'LOW_STOCK' : 'IN_STOCK'),
                        },
                    });
                }
            }
        }
        await prisma_js_1.default.rentalRequest.delete({ where: { id } });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'DELETE',
            module: 'RENTALS',
            description: `Deleted rental request #${existing.rentalNumber}`,
            metadata: { rentalId: id, rentalNumber: existing.rentalNumber },
        });
        res.json({ success: true, message: 'Rental request deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to delete rental request' });
    }
};
exports.deleteRentalRequest = deleteRentalRequest;
