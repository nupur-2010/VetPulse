import { Router } from 'express';
import { healthReportController } from '../controllers/index.js';
import { validateBody, validateQuery, validateParams, upload } from '../middleware/index.js';
import { createHealthReportSchema, updateHealthReportSchema, reportIdSchema, reportListQuerySchema } from '../validators/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { consultationService } from '../services/index.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize('FARMER'),
  upload.array('photos', 5),
  validateBody(createHealthReportSchema),
  (req, res, next) => healthReportController.create(req, res, next)
);

router.get(
  '/',
  authorize('FARMER', 'VETERINARIAN', 'ADMIN'),
  validateQuery(reportListQuerySchema),
  (req, res, next) => healthReportController.findAll(req, res, next)
);

router.get('/stats', authorize('FARMER', 'ADMIN'), (req, res, next) => healthReportController.getStats(req, res, next));
router.get('/:reportId', authorize('FARMER', 'VETERINARIAN', 'ADMIN'), validateParams(reportIdSchema), (req, res, next) => healthReportController.findById(req, res, next));
router.patch('/:reportId', authorize('FARMER'), validateParams(reportIdSchema), validateBody(updateHealthReportSchema), (req, res, next) => healthReportController.update(req, res, next));
router.get('/:reportId/prediction', authorize('FARMER', 'VETERINARIAN', 'ADMIN'), validateParams(reportIdSchema), (req, res, next) => healthReportController.getPrediction(req, res, next));

router.post('/:reportId/consultation', authorize('FARMER', 'ADMIN'), validateParams(reportIdSchema), async (req, res, next) => {
  try {
    const farmerId = req.user!.farmerProfileId || '';
    const consultation = await consultationService.createFarmerRequest(farmerId, req.params.reportId, req.body.notes);
    res.status(201).json({ success: true, data: consultation });
  } catch (error) {
    next(error);
  }
});

export default router;
