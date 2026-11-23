import { Router } from 'express';
import { healthReportController } from '../controllers/index.js';
import { validateBody, validateParams } from '../middleware/index.js';
import { createHealthReportSchema, updateHealthReportSchema, reportIdSchema, reportListQuerySchema } from '../validators/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('FARMER'), validateBody(createHealthReportSchema), (req, res, next) => healthReportController.create(req, res, next));
router.get('/', authorize('FARMER', 'VETERINARIAN', 'ADMIN'), validateBody(reportListQuerySchema), (req, res, next) => healthReportController.findAll(req, res, next));
router.get('/stats', authorize('FARMER', 'ADMIN'), (req, res, next) => healthReportController.getStats(req, res, next));
router.get('/:reportId', authorize('FARMER', 'VETERINARIAN', 'ADMIN'), validateParams(reportIdSchema), (req, res, next) => healthReportController.findById(req, res, next));
router.patch('/:reportId', authorize('FARMER'), validateParams(reportIdSchema), validateBody(updateHealthReportSchema), (req, res, next) => healthReportController.update(req, res, next));
router.get('/:reportId/prediction', authorize('FARMER', 'VETERINARIAN', 'ADMIN'), validateParams(reportIdSchema), (req, res, next) => healthReportController.getPrediction(req, res, next));

export default router;