import { Router } from 'express';
import { listGallery, createGalleryImage, updateGalleryImage, deleteGalleryImage } from '../controllers/galleryController.js';
import { authenticate } from '../middleware/auth.js';
import { requireStaffOrAdmin } from '../middleware/authorize.js';

const router = Router();

router.get('/', listGallery);

router.post('/', authenticate, requireStaffOrAdmin, createGalleryImage);
router.put('/:id', authenticate, requireStaffOrAdmin, updateGalleryImage);
router.delete('/:id', authenticate, requireStaffOrAdmin, deleteGalleryImage);

export default router;
