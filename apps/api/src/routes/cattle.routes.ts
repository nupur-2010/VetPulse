import { Router } from 'express';
import { cattleController } from '../controllers/index.js';
import { validateBody, validateParams } from '../middleware/index.js';
import { createCattleSchema, updateCattleSchema, cattleIdSchema, cattleListQuerySchema, addVaccinationSchema } from '../validators/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, authorize('FARMER', 'ADMIN'));

router.post('/', validateBody(createCattleSchema), (req, res, next) => cattleController.create(req, res, next));
router.get('/', validateBody(cattleListQuerySchema), (req, res, next) => cattleController.findAll(req, res, next));
router.get('/:cattleId', validateParams(cattleIdSchema), (req, res, next) => cattleController.findById(req, res, next));
router.patch('/:cattleId', validateParams(cattleIdSchema), validateBody(updateCattleSchema), (req, res, next) => cattleController.update(req, res, next));
router.delete('/:cattleId', validateParams(cattleIdSchema), (req, res, next) => cattleController.archive(req, res, next));
router.post('/:cattleId/vaccinations', validateParams(cattleIdSchema), validateBody(addVaccinationSchema), (req, res, next) => cattleController.addVaccination(req, res, next));
router.get('/:cattleId/vaccinations', validateParams(cattleIdSchema), (req, res, next) => cattleController.getVaccinations(req, res, next));

export default router;