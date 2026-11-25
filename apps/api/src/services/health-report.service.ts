import prisma from '../config/database.js';
import { CreateHealthReportInput, UpdateHealthReportInput, ReportListQuery } from '../validators/index.js';
import { NotFoundError } from '../errors/index.js';
import { PaginatedResponse } from '../types/index.js';
import { predictionService } from './prediction.service.js';

export class HealthReportService {
  async create(farmerId: string, input: CreateHealthReportInput, photoUrls: string[] = []): Promise<any> {
    const cattle = await prisma.cattle.findFirst({
      where: { id: input.cattleId, ownerId: farmerId, isActive: true },
    });

    if (!cattle) {
      throw new NotFoundError('Cattle not found or not active');
    }

    const report = await prisma.healthReport.create({
      data: {
        reportNumber: `RPT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        cattleId: input.cattleId,
        farmerId,
        state: input.state,
        district: input.district,
        village: input.village,
        latitude: input.latitude,
        longitude: input.longitude,
        location: input.location,
        temperature: input.temperature,
        symptomDuration: input.symptomDuration,
        severity: input.severity,
        milkProductionChange: input.milkProductionChange,
        waterIntakeChange: input.waterIntakeChange,
        recentVaccination: input.recentVaccination,
        recentIllness: input.recentIllness,
        recentTreatment: input.recentTreatment,
        additionalNotes: input.additionalNotes,
        consultationRequested: input.consultationRequested,
        status: 'PENDING',
        symptoms: {
          create: input.symptoms.map(s => ({
            symptomName: s.symptomName,
            symptomGroup: s.symptomGroup || 'General',
          })),
        },
        photos: photoUrls.length > 0 ? {
          create: photoUrls.map(url => ({
            photoUrl: url,
          })),
        } : undefined,
      },
      include: {
        symptoms: true,
        photos: true,
        cattle: { select: { id: true, tagNumber: true, name: true, breed: true, farm: { select: { name: true } } } },
        farmer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    // Run AI prediction immediately for real-time result
    try {
      await predictionService.processReport(report.id);
    } catch (err) {
      console.error('Failed to process AI prediction during report creation:', err);
    }

    return this.findById(report.id);
  }

  async findAll(farmerId: string | undefined, query: ReportListQuery, vetId?: string): Promise<PaginatedResponse<any>> {
    const { page, limit, status, state, district, disease, startDate, endDate, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (farmerId) {
      where.farmerId = farmerId;
    }

    if (vetId) {
      const vet = await prisma.vetProfile.findUnique({ where: { id: vetId } });
      const vetState = vet?.licenseState;
      if (vetState) {
        where.state = { equals: vetState, mode: 'insensitive' };
      }
    }

    if (status) where.status = status;
    if (state && !where.state) where.state = state;
    if (district) where.district = district;
    if (disease) {
      where.prediction = { predictedDisease: { contains: disease, mode: 'insensitive' } };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const orderBy: any = {};
    if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'status') {
      orderBy[sortBy] = sortOrder;
    }

    const [reports, total] = await Promise.all([
      prisma.healthReport.findMany({
        where,
        include: {
          symptoms: true,
          photos: true,
          prediction: {
            include: {
              vetReviews: {
                include: {
                  vet: { select: { id: true, firstName: true, lastName: true, specialization: true } },
                },
              },
            },
          },
          cattle: { select: { id: true, tagNumber: true, name: true, breed: true, gender: true, weight: true } },
          farmer: { select: { id: true, firstName: true, lastName: true, phone: true, state: true, district: true, village: true } },
          _count: { select: { consultations: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.healthReport.count({ where }),
    ]);

    const formattedReports = reports.map(r => {
      const rep = r as any;
      if (r.prediction?.vetReviews && r.prediction.vetReviews.length > 0) {
        rep.vetReview = r.prediction.vetReviews[0];
      }
      return rep;
    });

    return { data: formattedReports, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findById(reportId: string, farmerId?: string): Promise<any> {
    const where: any = { id: reportId };
    if (farmerId) {
      where.farmerId = farmerId;
    }

    const report = await prisma.healthReport.findFirst({
      where,
      include: {
        symptoms: true,
        photos: true,
        prediction: {
          include: {
            candidates: true,
            vetReviews: {
              include: {
                vet: { select: { id: true, firstName: true, lastName: true, specialization: true } },
              },
            },
          },
        },
        consultations: { include: { vet: { select: { id: true, firstName: true, lastName: true } } } },
        cattle: { select: { id: true, tagNumber: true, name: true, breed: true, gender: true, weight: true, dateOfBirth: true, estimatedAge: true, identificationMarks: true, pregnancyStatus: true, farm: { select: { name: true, address: true } } } },
        farmer: { select: { id: true, firstName: true, lastName: true, phone: true, state: true, district: true, village: true, address: true } },
      },
    });

    if (!report) throw new NotFoundError('Health report');

    const result = report as any;
    if (report.prediction?.vetReviews && report.prediction.vetReviews.length > 0) {
      result.vetReview = report.prediction.vetReviews[0];
    }

    return result;
  }

  async update(reportId: string, farmerId: string, input: UpdateHealthReportInput): Promise<any> {
    const report = await prisma.healthReport.findFirst({ where: { id: reportId, farmerId } });
    if (!report) throw new NotFoundError('Health report');

    const updated = await prisma.healthReport.update({
      where: { id: reportId },
      data: input,
      include: { symptoms: true, photos: true, prediction: true },
    });

    return updated;
  }

  async getStats(farmerId: string): Promise<any> {
    const [total, pending, aiCompleted, vetReviewed] = await Promise.all([
      prisma.healthReport.count({ where: { farmerId } }),
      prisma.healthReport.count({ where: { farmerId, status: 'PENDING' } }),
      prisma.healthReport.count({ where: { farmerId, status: 'AI_COMPLETED' } }),
      prisma.healthReport.count({ where: { farmerId, status: 'VET_REVIEWED' } }),
    ]);

    return { total, pending, aiCompleted, vetReviewed };
  }
}

export const healthReportService = new HealthReportService();
