import { Request, Response, NextFunction } from 'express';
import { analyticsService, outbreakDetectionService } from '../services/index.js';
import { AnalyticsQuery, ClusterQuery, OutbreakAlertInput } from '../validators/index.js';

export class AnalyticsController {
  async getReportStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await analyticsService.getReportStats(req.query as unknown as AnalyticsQuery);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async getDiseaseBreakdown(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const breakdown = await analyticsService.getDiseaseBreakdown(req.query as unknown as AnalyticsQuery);
      res.json({ success: true, data: breakdown });
    } catch (error) {
      next(error);
    }
  }

  async getGeographicStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const geoStats = await analyticsService.getGeographicStats(req.query as unknown as AnalyticsQuery);
      res.json({ success: true, data: geoStats });
    } catch (error) {
      next(error);
    }
  }

  async getClusters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clusters = await analyticsService.getAllClusters(req.query as unknown as ClusterQuery);
      res.json({ success: true, data: clusters });
    } catch (error) {
      next(error);
    }
  }

  async getClusterById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cluster = await analyticsService.getClusterById(req.params.clusterId);
      res.json({ success: true, data: cluster });
    } catch (error) {
      next(error);
    }
  }

  async updateClusterStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, notes } = req.body;
      const cluster = await analyticsService.updateClusterStatus(req.params.clusterId, status, notes, req.user?.id);
      res.json({ success: true, data: cluster });
    } catch (error) {
      next(error);
    }
  }

  async getActiveAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { state, district } = req.query;
      const alerts = await analyticsService.getActiveAlerts(state as string, district as string);
      res.json({ success: true, data: alerts });
    } catch (error) {
      next(error);
    }
  }

  async createAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const alert = await analyticsService.createOutbreakAlert(req.body as OutbreakAlertInput);
      res.status(201).json({ success: true, data: alert });
    } catch (error) {
      next(error);
    }
  }

  async detectOutbreaks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clusters = await outbreakDetectionService.detectClusters();
      const alerts = await outbreakDetectionService.generateAlerts();
      res.json({ success: true, data: { clusters, alerts } });
    } catch (error) {
      next(error);
    }
  }

  async getHighRiskAreas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const areas = await outbreakDetectionService.getHighRiskAreas();
      res.json({ success: true, data: areas });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();