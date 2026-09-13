import { Router } from 'express';
import { getDashboardOverview } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';
import { requireStaffOrAdmin } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);
router.use(requireStaffOrAdmin);

router.get('/overview', getDashboardOverview);

export default router;
