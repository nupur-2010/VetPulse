import { Router } from 'express';
import { veterinarianController } from '../controllers/index.js';
import { validateBody, validateParams } from '../middleware/index.js';
import { vetProfileUpdateSchema, vetAvailabilitySchema, vetListQuerySchema, vetIdSchema } from '../validators/index.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, validateBody(vetListQuerySchema), (req, res, next) => veterinarianController.findAll(req, res, next));
router.get('/:vetId', optionalAuth, validateParams(vetIdSchema), (req, res, next) => veterinarianController.findById(req, res, next));
router.patch('/profile', authenticate, authorize('VETERINARIAN'), validateBody(vetProfileUpdateSchema), (req, res, next) => veterinarianController.updateProfile(req, res, next));
router.post('/availability', authenticate, authorize('VETERINARIAN'), validateBody(vetAvailabilitySchema), (req, res, next) => veterinarianController.setAvailability(req, res, next));
router.get('/availability/me', authenticate, authorize('VETERINARIAN'), (req, res, next) => veterinarianController.getAvailability(req, res, next));

export default router;