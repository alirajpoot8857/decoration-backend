"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBookingStatus = exports.createBooking = exports.getBooking = exports.listBookings = void 0;
const prisma_js_1 = __importDefault(require("../utils/prisma.js"));
const activityLogger_js_1 = require("../middleware/activityLogger.js");
const notificationService_js_1 = require("../utils/notificationService.js");
const validation_js_1 = require("../utils/validation.js");
const listBookings = async (req, res) => {
    try {
        const { status, eventType, search } = req.query;
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
        if (eventType && typeof eventType === 'string' && eventType !== 'All' && eventType !== 'undefined' && eventType !== 'null') {
            where.eventType = eventType;
        }
        if (search && typeof search === 'string' && search !== 'undefined' && search !== 'null' && search.trim() !== '') {
            where.OR = [
                { customerName: { contains: search } },
                { customerEmail: { contains: search } },
                { bookingNumber: { contains: search } },
                { venue: { contains: search } },
            ];
        }
        const bookings = await prisma_js_1.default.booking.findMany({
            where,
            include: {
                package: true,
                customer: true,
                event: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, count: bookings.length, bookings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to list bookings' });
    }
};
exports.listBookings = listBookings;
const getBooking = async (req, res) => {
    try {
        const id = req.params.id;
        const booking = await prisma_js_1.default.booking.findUnique({
            where: { id },
            include: {
                package: true,
                customer: true,
                event: true,
            },
        });
        if (!booking) {
            res.status(404).json({ success: false, message: 'Booking not found' });
            return;
        }
        if (req.user?.role === 'CUSTOMER' && booking.customerEmail.toLowerCase() !== req.user.email.toLowerCase()) {
            res.status(403).json({ success: false, message: 'Unauthorized to view this booking' });
            return;
        }
        res.json({ success: true, booking });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to get booking' });
    }
};
exports.getBooking = getBooking;
const createBooking = async (req, res) => {
    try {
        const { customerName, customerEmail, customerPhone, eventType, eventDate, venue, guestCount, budget, packageId, packageName, specialRequests, } = req.body;
        if (!customerName || !customerEmail || !customerPhone || !eventType || !eventDate || !venue) {
            res.status(400).json({ success: false, message: 'Missing required booking fields' });
            return;
        }
        if (!(0, validation_js_1.isValidPakistaniPhone)(customerPhone)) {
            res.status(400).json({
                success: false,
                message: 'Please provide a valid Pakistani phone number (e.g. 03140660985 or +923140660985)',
            });
            return;
        }
        let finalPackageName = packageName ? String(packageName) : null;
        let totalAmount = Number(budget) || 0;
        if (packageId) {
            const pkg = await prisma_js_1.default.package.findUnique({ where: { id: String(packageId) } });
            if (pkg) {
                finalPackageName = pkg.name;
                if (totalAmount === 0) {
                    totalAmount = pkg.price;
                }
            }
        }
        const bookingNumber = `LUM-${Date.now().toString().slice(-6)}`;
        let customerId = null;
        if (req.user?.userId) {
            const userCust = await prisma_js_1.default.customer.findFirst({ where: { userId: req.user.userId } });
            if (userCust)
                customerId = userCust.id;
        }
        else {
            const existing = await prisma_js_1.default.customer.findUnique({ where: { email: String(customerEmail).toLowerCase() } });
            if (existing)
                customerId = existing.id;
        }
        const booking = await prisma_js_1.default.booking.create({
            data: {
                bookingNumber,
                customerId,
                customerName: String(customerName),
                customerEmail: String(customerEmail).toLowerCase(),
                customerPhone: String(customerPhone),
                eventType: String(eventType),
                eventDate: new Date(eventDate),
                venue: String(venue),
                guestCount: Number(guestCount) || 50,
                budget: Number(budget) || 0,
                packageId: packageId ? String(packageId) : null,
                packageName: finalPackageName,
                status: 'PENDING',
                specialRequests: specialRequests ? String(specialRequests) : null,
                totalAmount,
            },
            include: {
                package: true,
            },
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'CREATE',
            module: 'BOOKINGS',
            description: `New event booking request #${bookingNumber} submitted by ${customerName} (${eventType} at ${venue})`,
            metadata: { bookingId: booking.id, bookingNumber, eventType, venue },
        });
        const notificationPayload = {
            orderType: 'BOOKING',
            referenceNumber: bookingNumber,
            customerName: String(customerName),
            customerEmail: String(customerEmail),
            customerPhone: String(customerPhone),
            eventType: String(eventType),
            location: String(venue),
            eventDate: new Date(eventDate),
            guestCount: Number(guestCount) || 50,
            budget: Number(budget) || totalAmount,
            packageName: finalPackageName || undefined,
            items: finalPackageName ? [{ name: `${finalPackageName} (${eventType})`, quantity: 1, total: totalAmount }] : undefined,
            totalAmount,
            notes: specialRequests ? String(specialRequests) : undefined,
        };
        (0, notificationService_js_1.sendOrderEmailNotification)(notificationPayload).catch((e) => console.warn('Email dispatch error:', e));
        const waResult = await (0, notificationService_js_1.sendWhatsAppNotification)(notificationPayload).catch(() => ({ waLink: '' }));
        res.status(201).json({
            success: true,
            message: 'Event booking request submitted successfully',
            booking,
            waNotificationLink: waResult?.waLink || '',
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to submit booking' });
    }
};
exports.createBooking = createBooking;
const updateBookingStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const { status, packageId, internalNotes, totalAmount, venue, guestCount } = req.body;
        const existing = await prisma_js_1.default.booking.findUnique({ where: { id }, include: { event: true } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Booking not found' });
            return;
        }
        const oldStatus = existing.status;
        const updateData = {};
        if (status)
            updateData.status = String(status);
        if (internalNotes !== undefined)
            updateData.internalNotes = internalNotes ? String(internalNotes) : null;
        if (totalAmount !== undefined)
            updateData.totalAmount = Number(totalAmount);
        if (venue !== undefined)
            updateData.venue = String(venue);
        if (guestCount !== undefined)
            updateData.guestCount = Number(guestCount);
        if (packageId !== undefined) {
            updateData.packageId = packageId ? String(packageId) : null;
            if (packageId) {
                const pkg = await prisma_js_1.default.package.findUnique({ where: { id: String(packageId) } });
                if (pkg)
                    updateData.packageName = pkg.name;
            }
            else {
                updateData.packageName = null;
            }
        }
        const updated = await prisma_js_1.default.booking.update({
            where: { id },
            data: updateData,
            include: { package: true, event: true },
        });
        if (status === 'CONFIRMED' && !existing.event) {
            await prisma_js_1.default.event.create({
                data: {
                    title: `${existing.customerName}'s ${existing.eventType}`,
                    bookingId: existing.id,
                    eventType: existing.eventType,
                    eventDate: existing.eventDate,
                    venue: existing.venue,
                    clientName: existing.customerName,
                    clientPhone: existing.customerPhone,
                    status: 'SCHEDULED',
                    setupTeamNotes: `Confirmed from Booking #${existing.bookingNumber}`,
                },
            });
        }
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'STATUS_CHANGE',
            module: 'BOOKINGS',
            description: `Updated booking #${existing.bookingNumber} status to "${status || oldStatus}"`,
            metadata: { bookingId: existing.id, oldStatus, newStatus: status || oldStatus },
        });
        if (status && oldStatus !== status) {
            (0, notificationService_js_1.sendStatusChangeEmailNotification)({
                orderType: 'BOOKING',
                referenceNumber: existing.bookingNumber,
                customerName: existing.customerName,
                customerEmail: existing.customerEmail,
                customerPhone: existing.customerPhone,
                newStatus: String(status),
                oldStatus: String(oldStatus),
                totalAmount: existing.totalAmount,
                eventDate: existing.eventDate,
                venue: existing.venue,
            }).catch((e) => console.warn('Booking status change email error:', e));
        }
        res.json({ success: true, message: 'Booking updated successfully', booking: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update booking' });
    }
};
exports.updateBookingStatus = updateBookingStatus;
