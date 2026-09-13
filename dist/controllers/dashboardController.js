"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardOverview = void 0;
const prisma_js_1 = __importDefault(require("../utils/prisma.js"));
const getDashboardOverview = async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
        const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const [totalBookings, pendingBookings, confirmedBookings, inProgressBookings, completedBookings, upcomingEvents, totalCustomers, totalUsers, inventoryItems, allSales, allPurchases, allRentals, recentBookings, recentRentalRequests, recentActivityLogs,] = await Promise.all([
            prisma_js_1.default.booking.count(),
            prisma_js_1.default.booking.count({ where: { status: 'PENDING' } }),
            prisma_js_1.default.booking.count({ where: { status: 'CONFIRMED' } }),
            prisma_js_1.default.booking.count({ where: { status: 'IN_PROGRESS' } }),
            prisma_js_1.default.booking.count({ where: { status: 'COMPLETED' } }),
            prisma_js_1.default.event.findMany({
                where: { eventDate: { gte: now, lte: thirtyDaysAhead } },
                orderBy: { eventDate: 'asc' },
                take: 5,
            }),
            prisma_js_1.default.customer.count(),
            prisma_js_1.default.user.count(),
            prisma_js_1.default.inventory.findMany(),
            prisma_js_1.default.sale.findMany({ where: { paymentStatus: 'PAID' } }),
            prisma_js_1.default.purchase.findMany({ where: { paymentStatus: 'PAID' } }),
            prisma_js_1.default.rentalRequest.findMany({ where: { status: { not: 'CANCELLED' } } }),
            prisma_js_1.default.booking.findMany({
                orderBy: { createdAt: 'desc' },
                take: 6,
                include: { package: true, customer: true },
            }),
            prisma_js_1.default.rentalRequest.findMany({
                orderBy: { createdAt: 'desc' },
                take: 6,
                include: { customer: true },
            }),
            prisma_js_1.default.activityLog.findMany({
                orderBy: { createdAt: 'desc' },
                take: 8,
            }),
        ]);
        // Parse items in recent rentals
        const parsedRecentRentals = recentRentalRequests.map((r) => ({
            ...r,
            items: typeof r.itemsJson === 'string' ? JSON.parse(r.itemsJson || '[]') : r.itemsJson,
        }));
        // --- Daily Data Calculations (Today) ---
        const todaySales = allSales.filter((s) => s.saleDate >= startOfToday && s.saleDate < endOfToday);
        const todaySalesRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
        const todayRentals = allRentals.filter((r) => r.createdAt >= startOfToday && r.createdAt < endOfToday);
        const todayRentalRevenue = todayRentals.reduce((sum, r) => sum + r.totalAmount, 0);
        const todayBookings = await prisma_js_1.default.booking.findMany({
            where: {
                createdAt: { gte: startOfToday, lt: endOfToday },
                status: { not: 'CANCELLED' },
            },
        });
        const todayBookingRevenue = todayBookings.reduce((sum, b) => sum + b.totalAmount, 0);
        const todayPurchases = allPurchases.filter((p) => p.purchaseDate >= startOfToday && p.purchaseDate < endOfToday);
        const todayPurchaseExpenses = todayPurchases.reduce((sum, p) => sum + p.total, 0);
        const todayRevenue = todaySalesRevenue + todayRentalRevenue + todayBookingRevenue;
        const todayNetProfit = todayRevenue - todayPurchaseExpenses;
        // --- Cumulative Totals ---
        const salesRevenue = allSales.reduce((sum, s) => sum + s.total, 0);
        const rentalRevenue = allRentals.reduce((sum, r) => sum + r.totalAmount, 0);
        const bookingRevenue = (await prisma_js_1.default.booking.findMany({
            where: { status: { in: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] } },
        })).reduce((sum, b) => sum + b.totalAmount, 0);
        const totalRevenue = salesRevenue + rentalRevenue + bookingRevenue;
        const purchaseExpenses = allPurchases.reduce((sum, p) => sum + p.total, 0);
        const netProfit = totalRevenue - purchaseExpenses;
        // --- Inventory metrics ---
        const totalInventoryQty = inventoryItems.reduce((sum, i) => sum + i.quantity, 0);
        const availableInventoryQty = inventoryItems.reduce((sum, i) => sum + i.availableQuantity, 0);
        const rentedInventoryQty = Math.max(0, totalInventoryQty - availableInventoryQty);
        const lowStockCount = inventoryItems.filter((i) => i.availableQuantity <= i.minThreshold && i.availableQuantity > 0).length;
        const outOfStockCount = inventoryItems.filter((i) => i.availableQuantity <= 0).length;
        // --- DAILY PERFORMANCE BREAKDOWN (Last 7 Days) ---
        const dailyData = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(startOfToday.getTime() - i * 24 * 60 * 60 * 1000);
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            const dSales = allSales
                .filter((s) => s.saleDate >= dayStart && s.saleDate < dayEnd)
                .reduce((sum, s) => sum + s.total, 0);
            const dRentals = allRentals
                .filter((r) => r.createdAt >= dayStart && r.createdAt < dayEnd)
                .reduce((sum, r) => sum + r.totalAmount, 0);
            const dPurchases = allPurchases
                .filter((p) => p.purchaseDate >= dayStart && p.purchaseDate < dayEnd)
                .reduce((sum, p) => sum + p.total, 0);
            const dBookings = await prisma_js_1.default.booking.findMany({
                where: { createdAt: { gte: dayStart, lt: dayEnd }, status: { not: 'CANCELLED' } },
            });
            const dBookingRev = dBookings.reduce((sum, b) => sum + b.totalAmount, 0);
            const dRev = dSales + dRentals + dBookingRev;
            const dProfit = dRev - dPurchases;
            const label = i === 0
                ? 'Today'
                : i === 1
                    ? 'Yesterday'
                    : `${dayNames[dayStart.getDay()]} ${dayStart.getDate()}/${dayStart.getMonth() + 1}`;
            dailyData.push({
                day: label,
                date: dayStart.toISOString().split('T')[0],
                revenue: dRev,
                sales: dSales,
                rentals: dRentals,
                purchases: dPurchases,
                bookings: dBookings.length,
                profit: dProfit,
            });
        }
        res.json({
            success: true,
            stats: {
                // Daily Focus Metrics (Today Only)
                todayRevenue,
                todaySalesRevenue,
                todayRentalRevenue,
                todayBookingRevenue,
                todayPurchaseExpenses,
                todayNetProfit,
                todayOrdersCount: todaySales.length + todayRentals.length + todayBookings.length,
                todaySalesCount: todaySales.length,
                todayRentalsCount: todayRentals.length,
                todayBookingsCount: todayBookings.length,
                todayPurchasesCount: todayPurchases.length,
                // Cumulative Totals
                totalBookings,
                pendingBookings,
                confirmedBookings,
                inProgressBookings,
                completedBookings,
                upcomingEventsCount: upcomingEvents.length,
                totalCustomers,
                totalUsers,
                totalRevenue,
                salesRevenue,
                rentalRevenue,
                bookingRevenue,
                purchaseExpenses,
                netProfit,
                totalInventoryQty,
                availableInventoryQty,
                rentedInventoryQty,
                lowStockCount,
                outOfStockCount,
            },
            upcomingEvents,
            recentBookings,
            recentRentals: parsedRecentRentals,
            recentActivityLogs,
            charts: {
                daily: dailyData,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch dashboard overview' });
    }
};
exports.getDashboardOverview = getDashboardOverview;
