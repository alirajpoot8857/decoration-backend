import { Router } from 'express';
import { listServices, getServiceBySlug, createService, updateService, deleteService } from '../controllers/serviceController.js';
import { authenticate } from '../middleware/auth.js';
import { requireStaffOrAdmin } from '../middleware/authorize.js';

const router = Router();

router.get('/', listServices);
router.get('/:slug', getServiceBySlug);

router.post('/', authenticate, requireStaffOrAdmin, createService);
router.put('/:id', authenticate, requireStaffOrAdmin, updateService);
router.delete('/:id', authenticate, requireStaffOrAdmin, deleteService);

export default router;
