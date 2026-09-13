import { Router } from 'express';
import { listPackages, getPackageBySlug, createPackage, updatePackage, deletePackage } from '../controllers/packageController.js';
import { authenticate } from '../middleware/auth.js';
import { requireStaffOrAdmin } from '../middleware/authorize.js';

const router = Router();

router.get('/', listPackages);
router.get('/:slug', getPackageBySlug);

router.post('/', authenticate, requireStaffOrAdmin, createPackage);
router.put('/:id', authenticate, requireStaffOrAdmin, updatePackage);
router.delete('/:id', authenticate, requireStaffOrAdmin, deletePackage);

export default router;
