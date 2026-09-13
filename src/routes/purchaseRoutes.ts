import { Router } from 'express';
import { listPurchases, getPurchase, createPurchase, updatePurchaseStatus, deletePurchase } from '../controllers/purchaseController.js';
import { authenticate } from '../middleware/auth.js';
import { requireStaffOrAdmin } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);
router.use(requireStaffOrAdmin);

router.get('/', listPurchases);
router.get('/:id', getPurchase);
router.post('/', createPurchase);
router.put('/:id/status', updatePurchaseStatus);
router.delete('/:id', deletePurchase);

export default router;
