import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/index.js';
import { UserManagementQuery } from '../validators/index.js';

export class AdminController {
  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await analyticsService.getUsers(req.query as unknown as UserManagementQuery);
      res.json({ success: true, ...result, users: result.data, total: result.pagination.total });
    } catch (error) {
      next(error);
    }
  }

  async toggleUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;
      await analyticsService.toggleUserStatus(userId, isActive);
      res.json({ success: true, message: `User ${isActive ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
      next(error);
    }
  }

  async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await analyticsService.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();