import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/index.js';
import { RegisterInput, LoginInput, RefreshTokenInput, ChangePasswordInput } from '../validators/index.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body as RegisterInput);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body as LoginInput);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.refreshToken((req.body as RefreshTokenInput).refreshToken);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body as RefreshTokenInput;
      await authService.logout(refreshToken);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body as ChangePasswordInput;
      await authService.changePassword(req.user!.id, currentPassword, newPassword);
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getUserById(req.user!.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();