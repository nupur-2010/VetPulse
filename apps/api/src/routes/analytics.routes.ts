import { Router } from 'express';
import { analyticsController } from '../controllers/index.js';
import { validateBody, validateParams } from '../middleware/index.js';
import { analyticsQuerySchema, clusterQuerySchema, outbreakAlertSchema, clusterIdSchema, alertIdSchema } from '../validators/index.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authenticate, authorize('ADMIN', 'VETERINARIAN'), validateBody(analyticsQuerySchema), (req, res, next) => analyticsController.getReportStats(req, res, next));
router.get('/diseases', authenticate, authorize('ADMIN', 'VETERINARIAN'), validateBody(analyticsQuerySchema), (req, res, next) => analyticsController.getDiseaseBreakdown(req, res, next));
router.get('/geographic', authenticate, authorize('ADMIN', 'VETERINARIAN'), validateBody(analyticsQuerySchema), (req, res, next) => analyticsController.getGeographicStats(req, res, next));

router.get('/clusters', authenticate, authorize('ADMIN', 'VETERINARIAN'), validateBody(clusterQuerySchema), (req, res, next) => analyticsController.getClusters(req, res, next));
router.get('/clusters/:clusterId', authenticate, authorize('ADMIN', 'VETERINARIAN'), validateParams(clusterIdSchema), (req, res, next) => analyticsController.getClusterById(req, res, next));
router.patch('/clusters/:clusterId', authenticate, authorize('ADMIN'), validateParams(clusterIdSchema), (req, res, next) => analyticsController.updateClusterStatus(req, res, next));

router.get('/alerts', optionalAuth, (req, res, next) => analyticsController.getActiveAlerts(req, res, next));
router.post('/alerts', authenticate, authorize('ADMIN'), validateBody(outbreakAlertSchema), (req, res, next) => analyticsController.createAlert(req, res, next));

router.post('/detect-outbreaks', authenticate, authorize('ADMIN'), (req, res, next) => analyticsController.detectOutbreaks(req, res, next));
router.get('/high-risk-areas', authenticate, authorize('ADMIN', 'VETERINARIAN'), (req, res, next) => analyticsController.getHighRiskAreas(req, res, next));

export default router;