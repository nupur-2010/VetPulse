import { Router } from 'express';
import { authController } from '../controllers/index.js';
import { validateBody } from '../middleware/index.js';
import { registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema } from '../validators/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', validateBody(registerSchema), (req, res, next) => authController.register(req, res, next));
router.post('/login', validateBody(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post('/refresh-token', validateBody(refreshTokenSchema), (req, res, next) => authController.refreshToken(req, res, next));
router.post('/logout', validateBody(refreshTokenSchema), (req, res, next) => authController.logout(req, res, next));
router.post('/change-password', authenticate, validateBody(changePasswordSchema), (req, res, next) => authController.changePassword(req, res, next));
router.get('/profile', authenticate, (req, res, next) => authController.getProfile(req, res, next));

export default router;