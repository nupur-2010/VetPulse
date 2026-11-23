import { Request, Response, NextFunction } from 'express';
import { veterinarianService } from '../services/index.js';
import { VetProfileUpdateInput, VetAvailabilityInput, VetListQuery } from '../validators/index.js';

export class VeterinarianController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await veterinarianService.findAll(req.query as unknown as VetListQuery);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vet = await veterinarianService.findById(req.params.vetId);
      res.json({ success: true, data: vet });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vetId = req.user!.vetProfileId!;
      const vet = await veterinarianService.updateProfile(vetId, req.body as VetProfileUpdateInput);
      res.json({ success: true, data: vet });
    } catch (error) {
      next(error);
    }
  }

  async setAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vetId = req.user!.vetProfileId!;
      const availability = await veterinarianService.setAvailability(vetId, req.body as VetAvailabilityInput);
      res.json({ success: true, data: availability });
    } catch (error) {
      next(error);
    }
  }

  async getAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vetId = req.user!.vetProfileId!;
      const availability = await veterinarianService.getAvailability(vetId);
      res.json({ success: true, data: availability });
    } catch (error) {
      next(error);
    }
  }
}

export const veterinarianController = new VeterinarianController();