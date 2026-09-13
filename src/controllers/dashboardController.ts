import { Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const getDashboardOverview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalBookings,
      pendingBookings,
      confirmedBookings,
      inProgressBookings,
      completedBookings,
      upcomingEvents,
      totalCustomers,
      totalUsers,
      inventoryItems,
      allSales,
      allPurchases,
      allRentals,
      recentBookings,
      recentRentalRequests,
      recentActivityLogs,
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'PENDING' } }),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      prisma.booking.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.booking.count({ where: { status: 'COMPLETED' } }),
      prisma.event.findMany({
        where: { eventDate: { gte: now, lte: thirtyDaysAhead } },
        orderBy: { eventDate: 'asc' },
        take: 5,
      }),
      prisma.customer.count(),
      prisma.user.count(),
      prisma.inventory.findMany(),
      prisma.sale.findMany({ where: { paymentStatus: 'PAID' } }),
      prisma.purchase.findMany({ where: { paymentStatus: 'PAID' } }),
      prisma.rentalRequest.findMany({ where: { status: { not: 'CANCELLED' } } }),
      prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { package: true, customer: true },
      }),
      prisma.rentalRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { customer: true },
      }),
      prisma.activityLog.findMany({
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

    const todayBookings = await prisma.booking.findMany({
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
    const bookingRevenue = (
      await prisma.booking.findMany({
        where: { status: { in: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] } },
      })
    ).reduce((sum, b) => sum + b.totalAmount, 0);
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
    const dailyData: {
      day: string;
      date: string;
      revenue: number;
      sales: number;
      rentals: number;
      purchases: number;
      bookings: number;
      profit: number;
    }[] = [];

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

      const dBookings = await prisma.booking.findMany({
        where: { createdAt: { gte: dayStart, lt: dayEnd }, status: { not: 'CANCELLED' } },
      });
      const dBookingRev = dBookings.reduce((sum, b) => sum + b.totalAmount, 0);

      const dRev = dSales + dRentals + dBookingRev;
      const dProfit = dRev - dPurchases;

      const label =
        i === 0
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch dashboard overview' });
  }
};
