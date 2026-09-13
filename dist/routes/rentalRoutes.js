"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rentalController_js_1 = require("../controllers/rentalController.js");
const auth_js_1 = require("../middleware/auth.js");
const authorize_js_1 = require("../middleware/authorize.js");
const router = (0, express_1.Router)();
// Public / client browsing & request submission
router.get('/items', rentalController_js_1.listRentalItems);
router.get('/summary', rentalController_js_1.getRentalSummary);
router.get('/items/:id', rentalController_js_1.getRentalItem);
router.post('/check-availability', rentalController_js_1.checkRentalAvailability);
router.post('/requests', auth_js_1.optionalAuthenticate, rentalController_js_1.submitRentalRequest);
// Customer / Admin rental request listings
router.get('/requests', auth_js_1.authenticate, rentalController_js_1.listRentalRequests);
router.put('/requests/:id/status', auth_js_1.authenticate, authorize_js_1.requireStaffOrAdmin, rentalController_js_1.updateRentalRequestStatus);
router.delete('/requests/:id', auth_js_1.authenticate, authorize_js_1.requireStaffOrAdmin, rentalController_js_1.deleteRentalRequest);
// Admin catalog management
router.post('/items', auth_js_1.authenticate, authorize_js_1.requireStaffOrAdmin, rentalController_js_1.createRentalItem);
router.put('/items/:id', auth_js_1.authenticate, authorize_js_1.requireStaffOrAdmin, rentalController_js_1.updateRentalItem);
router.delete('/items/:id', auth_js_1.authenticate, authorize_js_1.requireStaffOrAdmin, rentalController_js_1.deleteRentalItem);
exports.default = router;
