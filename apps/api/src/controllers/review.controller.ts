import { Request, Response, NextFunction } from 'express';
import { reviewService } from '../services/review.service.js';
import { AddPredictionReviewInput } from '../validators/index.js';

export class ReviewController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vetId = req.user!.vetProfileId!;
      const review = await reviewService.createReview(vetId, req.body as AddPredictionReviewInput);
      res.status(201).json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  }

  async getForReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await reviewService.getReviewForReport(req.params.reportId);
      res.json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  }
}

export const reviewController = new ReviewController();
