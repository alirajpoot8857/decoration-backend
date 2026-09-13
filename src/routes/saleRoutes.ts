import { Router } from 'express';
import { listSales, getUnifiedSalesLedger, getSale, createSale, updateSaleStatus, deleteSale } from '../controllers/saleController.js';
import { authenticate } from '../middleware/auth.js';
import { requireStaffOrAdmin } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);
router.use(requireStaffOrAdmin);

router.get('/unified', getUnifiedSalesLedger);
router.get('/', listSales);
router.get('/:id', getSale);
router.post('/', createSale);
router.put('/:id/status', updateSaleStatus);
router.delete('/:id', deleteSale);

export default router;
