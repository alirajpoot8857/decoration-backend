import { Router } from 'express';
import { submitInquiry, listInquiries, updateInquiryStatus, deleteInquiry } from '../controllers/contactController.js';
import { authenticate } from '../middleware/auth.js';
import { requireStaffOrAdmin } from '../middleware/authorize.js';

const router = Router();

router.post('/', submitInquiry);
router.get('/', authenticate, requireStaffOrAdmin, listInquiries);
router.put('/:id', authenticate, requireStaffOrAdmin, updateInquiryStatus);
router.delete('/:id', authenticate, requireStaffOrAdmin, deleteInquiry);

export default router;
