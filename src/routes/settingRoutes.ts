import { Router } from 'express';
import { listSettings, updateSetting, bulkUpdateSettings, sendTestEmail } from '../controllers/settingController.js';
import { authenticate } from '../middleware/auth.js';
import { requireStaffOrAdmin } from '../middleware/authorize.js';

const router = Router();

router.get('/', listSettings);
router.put('/:key', authenticate, requireStaffOrAdmin, updateSetting);
router.post('/bulk', authenticate, requireStaffOrAdmin, bulkUpdateSettings);
router.post('/test-email', authenticate, requireStaffOrAdmin, sendTestEmail);

export default router;
