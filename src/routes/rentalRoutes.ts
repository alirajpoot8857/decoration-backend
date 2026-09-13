import { Router } from 'express';
import {
  listRentalItems,
  getRentalItem,
  getRentalSummary,
  createRentalItem,
  updateRentalItem,
  deleteRentalItem,
  submitRentalRequest,
  listRentalRequests,
  updateRentalRequestStatus,
  deleteRentalRequest,
  checkRentalAvailability,
} from '../controllers/rentalController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { requireStaffOrAdmin } from '../middleware/authorize.js';

const router = Router();

// Public / client browsing & request submission
router.get('/items', listRentalItems);
router.get('/summary', getRentalSummary);
router.get('/items/:id', getRentalItem);
router.post('/check-availability', checkRentalAvailability);
router.post('/requests', optionalAuthenticate, submitRentalRequest);

// Customer / Admin rental request listings
router.get('/requests', authenticate, listRentalRequests);
router.put('/requests/:id/status', authenticate, requireStaffOrAdmin, updateRentalRequestStatus);
router.delete('/requests/:id', authenticate, requireStaffOrAdmin, deleteRentalRequest);

// Admin catalog management
router.post('/items', authenticate, requireStaffOrAdmin, createRentalItem);
router.put('/items/:id', authenticate, requireStaffOrAdmin, updateRentalItem);
router.delete('/items/:id', authenticate, requireStaffOrAdmin, deleteRentalItem);

export default router;
