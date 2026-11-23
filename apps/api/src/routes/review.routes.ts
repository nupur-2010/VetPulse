import { Router } from 'express';
import { reviewController } from '../controllers/review.controller.js';
import { validateBody, validateParams } from '../middleware/index.js';
import { addPredictionReviewSchema, reportIdSchema } from '../validators/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize('VETERINARIAN', 'ADMIN'),
  validateBody(addPredictionReviewSchema),
  (req, res, next) => reviewController.create(req, res, next)
);

router.get(
  '/report/:reportId',
  validateParams(reportIdSchema),
  (req, res, next) => reviewController.getForReport(req, res, next)
);

export default router;
