import { Router } from 'express';
import { listBookings, getBooking, createBooking, updateBookingStatus } from '../controllers/bookingController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { requireStaffOrAdmin } from '../middleware/authorize.js';

const router = Router();

// Public booking submission
router.post('/', optionalAuthenticate, createBooking);

// Protected: customer and admin can view bookings
router.get('/', authenticate, listBookings);
router.get('/:id', authenticate, getBooking);

// Staff/Admin updates
router.put('/:id/status', authenticate, requireStaffOrAdmin, updateBookingStatus);

export default router;
