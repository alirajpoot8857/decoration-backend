"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingController_js_1 = require("../controllers/bookingController.js");
const auth_js_1 = require("../middleware/auth.js");
const authorize_js_1 = require("../middleware/authorize.js");
const router = (0, express_1.Router)();
// Public booking submission
router.post('/', auth_js_1.optionalAuthenticate, bookingController_js_1.createBooking);
// Protected: customer and admin can view bookings
router.get('/', auth_js_1.authenticate, bookingController_js_1.listBookings);
router.get('/:id', auth_js_1.authenticate, bookingController_js_1.getBooking);
// Staff/Admin updates
router.put('/:id/status', auth_js_1.authenticate, authorize_js_1.requireStaffOrAdmin, bookingController_js_1.updateBookingStatus);
exports.default = router;
