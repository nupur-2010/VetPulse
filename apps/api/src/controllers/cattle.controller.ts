import { Request, Response, NextFunction } from 'express';
import { cattleService } from '../services/index.js';
import { CreateCattleInput, UpdateCattleInput, CattleListQuery, AddVaccinationInput } from '../validators/index.js';

export class CattleController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = req.user!.farmerProfileId!;
      const cattle = await cattleService.create(farmerId, req.body as CreateCattleInput);
      res.status(201).json({ success: true, data: cattle });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = req.user!.farmerProfileId!;
      const result = await cattleService.findAll(farmerId, req.query as unknown as CattleListQuery);
      res.json({ success: true, ...result, cattle: result.data, total: result.pagination.total });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = req.user!.farmerProfileId!;
      const cattle = await cattleService.findById(req.params.cattleId, farmerId);
      res.json({ success: true, data: cattle });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = req.user!.farmerProfileId!;
      const cattle = await cattleService.update(req.params.cattleId, farmerId, req.body as UpdateCattleInput);
      res.json({ success: true, data: cattle });
    } catch (error) {
      next(error);
    }
  }

  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = req.user!.farmerProfileId!;
      await cattleService.archive(req.params.cattleId, farmerId);
      res.json({ success: true, message: 'Cattle archived successfully' });
    } catch (error) {
      next(error);
    }
  }

  async addVaccination(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = req.user!.farmerProfileId!;
      const vaccination = await cattleService.addVaccination(req.params.cattleId, farmerId, req.body as AddVaccinationInput);
      res.status(201).json({ success: true, data: vaccination });
    } catch (error) {
      next(error);
    }
  }

  async getVaccinations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = req.user!.farmerProfileId!;
      const vaccinations = await cattleService.getVaccinations(req.params.cattleId, farmerId);
      res.json({ success: true, data: vaccinations });
    } catch (error) {
      next(error);
    }
  }

  async addPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farmerId = req.user!.farmerProfileId!;
      const file = (req as any).file;
      const photoUrl = file ? `/uploads/${file.filename}` : req.body.photoUrl || '/placeholder-cow.jpg';
      const cattle = await cattleService.addPhoto(req.params.cattleId, farmerId, photoUrl);
      res.status(201).json({ success: true, data: cattle });
    } catch (error) {
      next(error);
    }
  }
}

export const cattleController = new CattleController();