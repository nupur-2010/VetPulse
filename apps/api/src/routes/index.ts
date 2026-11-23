import { Router } from 'express';
import authRoutes from './auth.routes.js';
import cattleRoutes from './cattle.routes.js';
import healthReportRoutes from './health-report.routes.js';
import consultationRoutes from './consultation.routes.js';
import veterinarianRoutes from './veterinarian.routes.js';
import reviewRoutes from './review.routes.js';
import analyticsRoutes from './analytics.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/cattle', cattleRoutes);
router.use('/reports', healthReportRoutes);
router.use('/consultations', consultationRoutes);
router.use('/veterinarians', veterinarianRoutes);
router.use('/reviews', reviewRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;