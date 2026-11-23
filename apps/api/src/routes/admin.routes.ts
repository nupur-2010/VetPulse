import { Router } from 'express';
import { adminController } from '../controllers/index.js';
import { validateQuery } from '../middleware/index.js';
import { userManagementQuerySchema } from '../validators/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/users', validateQuery(userManagementQuerySchema), (req, res, next) => adminController.getUsers(req, res, next));
router.patch('/users/:userId', (req, res, next) => adminController.toggleUserStatus(req, res, next));
router.get('/dashboard', (req, res, next) => adminController.getDashboardStats(req, res, next));

export default router;