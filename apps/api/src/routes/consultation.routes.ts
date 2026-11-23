import { Router } from 'express';
import { consultationController } from '../controllers/index.js';
import { validateBody, validateParams } from '../middleware/index.js';
import { consultationRequestSchema, consultationUpdateSchema, consultationFeedbackSchema, consultationIdSchema, consultationListQuerySchema } from '../validators/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('VETERINARIAN'), validateBody(consultationRequestSchema), (req, res, next) => consultationController.request(req, res, next));
router.get('/vet', authorize('VETERINARIAN'), validateBody(consultationListQuerySchema), (req, res, next) => consultationController.findAllForVet(req, res, next));
router.get('/farmer', authorize('FARMER'), validateBody(consultationListQuerySchema), (req, res, next) => consultationController.findAllForFarmer(req, res, next));
router.get('/:consultationId', authorize('FARMER', 'VETERINARIAN', 'ADMIN'), validateParams(consultationIdSchema), (req, res, next) => consultationController.findById(req, res, next));
router.patch('/:consultationId', authorize('VETERINARIAN'), validateParams(consultationIdSchema), validateBody(consultationUpdateSchema), (req, res, next) => consultationController.update(req, res, next));
router.post('/:consultationId/feedback', authorize('FARMER'), validateParams(consultationIdSchema), validateBody(consultationFeedbackSchema), (req, res, next) => consultationController.addFeedback(req, res, next));

export default router;