import { Request, Response, NextFunction } from 'express';
import { consultationService } from '../services/index.js';
import { ConsultationRequestInput, ConsultationUpdateInput, ConsultationFeedbackInput } from '../validators/index.js';

export class ConsultationController {
  async request(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vetId = req.user!.vetProfileId!;
      const consultation = await consultationService.createRequest(vetId, req.body as ConsultationRequestInput);
      res.status(201).json({ success: true, data: consultation });
    } catch (error) {
      next(error);
    }
  }

  async findAllForVet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vetId = req.user!.vetProfileId!;
      const result = await consultationService.findAllForVet(vetId, req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async findAllForFarmer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = req.user!.farmerProfileId!;
      const result = await consultationService.findAllForFarmer(farmerId, req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const consultation = await consultationService.findById(req.params.consultationId);
      res.json({ success: true, data: consultation });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vetId = req.user!.vetProfileId!;
      const consultation = await consultationService.update(req.params.consultationId, vetId, req.body as ConsultationUpdateInput);
      res.json({ success: true, data: consultation });
    } catch (error) {
      next(error);
    }
  }

  async addFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = req.user!.farmerProfileId!;
      const { rating, feedback } = req.body as ConsultationFeedbackInput;
      const consultation = await consultationService.addFeedback(req.params.consultationId, farmerId, rating, feedback);
      res.json({ success: true, data: consultation });
    } catch (error) {
      next(error);
    }
  }
}

export const consultationController = new ConsultationController();