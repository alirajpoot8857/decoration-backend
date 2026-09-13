"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEvent = exports.updateEvent = exports.createEvent = exports.getEvent = exports.listEvents = void 0;
const prisma_js_1 = __importDefault(require("../utils/prisma.js"));
const activityLogger_js_1 = require("../middleware/activityLogger.js");
const listEvents = async (req, res) => {
    try {
        const { status, eventType, startDate, endDate } = req.query;
        const where = {};
        if (status && typeof status === 'string' && status !== 'All') {
            where.status = status;
        }
        if (eventType && typeof eventType === 'string' && eventType !== 'All') {
            where.eventType = eventType;
        }
        if (startDate || endDate) {
            where.eventDate = {};
            if (startDate && typeof startDate === 'string')
                where.eventDate.gte = new Date(startDate);
            if (endDate && typeof endDate === 'string')
                where.eventDate.lte = new Date(endDate);
        }
        const events = await prisma_js_1.default.event.findMany({
            where,
            include: { booking: true },
            orderBy: { eventDate: 'asc' },
        });
        res.json({ success: true, count: events.length, events });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to list events' });
    }
};
exports.listEvents = listEvents;
const getEvent = async (req, res) => {
    try {
        const id = req.params.id;
        const event = await prisma_js_1.default.event.findUnique({
            where: { id },
            include: { booking: true },
        });
        if (!event) {
            res.status(404).json({ success: false, message: 'Event not found' });
            return;
        }
        res.json({ success: true, event });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to get event' });
    }
};
exports.getEvent = getEvent;
const createEvent = async (req, res) => {
    try {
        const { title, bookingId, eventType, eventDate, endDate, venue, clientName, clientPhone, status, setupTeamNotes } = req.body;
        if (!title || !eventType || !eventDate || !venue || !clientName) {
            res.status(400).json({ success: false, message: 'Missing required event fields' });
            return;
        }
        const event = await prisma_js_1.default.event.create({
            data: {
                title: String(title),
                bookingId: bookingId ? String(bookingId) : null,
                eventType: String(eventType),
                eventDate: new Date(eventDate),
                endDate: endDate ? new Date(endDate) : null,
                venue: String(venue),
                clientName: String(clientName),
                clientPhone: clientPhone ? String(clientPhone) : null,
                status: status ? String(status) : 'SCHEDULED',
                setupTeamNotes: setupTeamNotes ? String(setupTeamNotes) : null,
            },
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'CREATE',
            module: 'EVENTS',
            description: `Scheduled event: "${event.title}" at ${event.venue} on ${new Date(event.eventDate).toLocaleDateString()}`,
            metadata: { eventId: event.id, title: event.title, date: event.eventDate },
        });
        res.status(201).json({ success: true, message: 'Event created successfully', event });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to create event' });
    }
};
exports.createEvent = createEvent;
const updateEvent = async (req, res) => {
    try {
        const id = req.params.id;
        const { title, eventType, eventDate, endDate, venue, clientName, clientPhone, status, setupTeamNotes } = req.body;
        const existing = await prisma_js_1.default.event.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Event not found' });
            return;
        }
        const updateData = {};
        if (title)
            updateData.title = String(title);
        if (eventType)
            updateData.eventType = String(eventType);
        if (eventDate)
            updateData.eventDate = new Date(eventDate);
        if (endDate !== undefined)
            updateData.endDate = endDate ? new Date(endDate) : null;
        if (venue)
            updateData.venue = String(venue);
        if (clientName)
            updateData.clientName = String(clientName);
        if (clientPhone !== undefined)
            updateData.clientPhone = clientPhone ? String(clientPhone) : null;
        if (status)
            updateData.status = String(status);
        if (setupTeamNotes !== undefined)
            updateData.setupTeamNotes = setupTeamNotes ? String(setupTeamNotes) : null;
        const updated = await prisma_js_1.default.event.update({
            where: { id },
            data: updateData,
        });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'UPDATE',
            module: 'EVENTS',
            description: `Updated event details for "${updated.title}"`,
            metadata: { eventId: updated.id, title: updated.title, status: updated.status },
        });
        res.json({ success: true, message: 'Event updated successfully', event: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update event' });
    }
};
exports.updateEvent = updateEvent;
const deleteEvent = async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await prisma_js_1.default.event.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Event not found' });
            return;
        }
        await prisma_js_1.default.event.delete({ where: { id } });
        await (0, activityLogger_js_1.logActivity)({
            req,
            action: 'DELETE',
            module: 'EVENTS',
            description: `Deleted event: "${existing.title}"`,
            metadata: { eventId: id, title: existing.title },
        });
        res.json({ success: true, message: 'Event deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to delete event' });
    }
};
exports.deleteEvent = deleteEvent;
