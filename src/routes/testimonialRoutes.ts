import { Router } from 'express';
import { listTestimonials, createTestimonial, updateTestimonial, deleteTestimonial } from '../controllers/testimonialController.js';
import { authenticate } from '../middleware/auth.js';
import { requireStaffOrAdmin } from '../middleware/authorize.js';

const router = Router();

router.get('/', listTestimonials);
router.post('/', authenticate, requireStaffOrAdmin, createTestimonial);
router.put('/:id', authenticate, requireStaffOrAdmin, updateTestimonial);
router.delete('/:id', authenticate, requireStaffOrAdmin, deleteTestimonial);

export default router;
