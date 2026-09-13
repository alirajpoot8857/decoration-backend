import { Router } from 'express';
import { listUsers, updateUserRole, deleteUser } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', listUsers);
router.put('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

export default router;
