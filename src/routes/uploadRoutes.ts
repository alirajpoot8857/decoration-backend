import { Router } from 'express';
import { uploadSingleImage } from '../controllers/uploadController.js';
import { upload } from '../middleware/upload.js';
import { authenticate } from '../middleware/auth.js';
import { requireStaffOrAdmin } from '../middleware/authorize.js';

const router = Router();

router.post('/image', authenticate, requireStaffOrAdmin, upload.single('image'), uploadSingleImage);

export default router;
