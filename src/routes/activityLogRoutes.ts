import { Router } from 'express';
import { listActivityLogs } from '../controllers/activityLogController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', listActivityLogs);

export default router;
