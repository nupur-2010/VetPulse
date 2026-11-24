import { Request, Response, NextFunction } from 'express';
import { healthReportService, predictionService } from '../services/index.js';
import { CreateHealthReportInput, UpdateHealthReportInput, ReportListQuery } from '../validators/index.js';

export class HealthReportController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = req.user!.farmerProfileId!;
      const files = req.files as Express.Multer.File[] | undefined;
      const photoUrls = files ? files.map(f => `/uploads/${f.filename}`) : [];
      const report = await healthReportService.create(farmerId, req.body as CreateHealthReportInput, photoUrls);
      res.status(201).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = req.user!.role === 'FARMER' ? req.user!.farmerProfileId : undefined;
      const vetId = req.user!.role === 'VETERINARIAN' ? req.user!.vetProfileId : undefined;
      const result = await healthReportService.findAll(farmerId, req.query as unknown as ReportListQuery, vetId);
      res.json({ success: true, ...result, reports: result.data, total: result.pagination.total });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = req.user!.role === 'FARMER' ? req.user!.farmerProfileId : undefined;
      const report = await healthReportService.findById(req.params.reportId, farmerId);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = req.user!.farmerProfileId!;
      const report = await healthReportService.update(req.params.reportId, farmerId, req.body as UpdateHealthReportInput);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  async getPrediction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let prediction = await predictionService.getPrediction(req.params.reportId);
      if (!prediction) {
        await predictionService.processReport(req.params.reportId);
        prediction = await predictionService.getPrediction(req.params.reportId);
      }
      res.json({ success: true, data: prediction });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = req.user!.role === 'FARMER' ? req.user!.farmerProfileId! : (req.query.farmerId as string || '');
      const stats = await healthReportService.getStats(farmerId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

export const healthReportController = new HealthReportController();
