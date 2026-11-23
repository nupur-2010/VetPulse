import prisma from '../config/database.js';
import { ConsultationRequestInput, ConsultationUpdateInput, ConsultationListQuery } from '../validators/index.js';
import { NotFoundError, ForbiddenError } from '../errors/index.js';
import { PaginatedResponse } from '../types/index.js';

export class ConsultationService {
  async createRequest(vetId: string, input: ConsultationRequestInput): Promise<any> {
    const report = await prisma.healthReport.findUnique({ where: { id: input.reportId }, include: { farmer: true } });
    if (!report) throw new NotFoundError('Health report');

    return prisma.consultation.create({
      data: {
        reportId: input.reportId, vetId, farmerId: report.farmerId, status: 'REQUESTED',
        reason: input.reason, scheduledAt: input.preferredDate ? new Date(input.preferredDate) : undefined,
      },
      include: {
        report: { include: { symptoms: true, prediction: true, cattle: true } },
        vet: { select: { id: true, firstName: true, lastName: true, specialization: true } },
        farmer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });
  }

  async createFarmerRequest(farmerId: string, reportId: string, notes?: string): Promise<any> {
    const report = await prisma.healthReport.findFirst({ where: { id: reportId, farmerId } });
    if (!report) throw new NotFoundError('Health report');

    let vet = await prisma.vetProfile.findFirst({
      where: { isAvailable: true },
    });
    if (!vet) {
      vet = await prisma.vetProfile.findFirst();
    }
    if (!vet) {
      throw new NotFoundError('No veterinarian available');
    }

    const consultation = await prisma.consultation.create({
      data: {
        reportId,
        farmerId,
        vetId: vet.id,
        status: 'REQUESTED',
        reason: notes || 'Consultation requested for health report',
      },
      include: {
        report: { include: { symptoms: true, prediction: true, cattle: true } },
        vet: { select: { id: true, firstName: true, lastName: true, specialization: true } },
        farmer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    await prisma.healthReport.update({
      where: { id: reportId },
      data: { consultationRequested: true },
    });

    return consultation;
  }

  async findAllForVet(vetId: string, query: ConsultationListQuery): Promise<PaginatedResponse<any>> {
    const { page, limit, status, sortBy, sortOrder } = query;
    const where: any = { vetId };
    if (status) where.status = status;
    const orderBy: any = sortBy === 'scheduledAt' ? { scheduledAt: sortOrder } : { createdAt: sortOrder };
    const skip = (page - 1) * limit;

    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({ where, include: { report: { include: { symptoms: true, cattle: true } }, farmer: true }, orderBy, skip, take: limit }),
      prisma.consultation.count({ where }),
    ]);

    return { data: consultations, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findAllForFarmer(farmerId: string, query: ConsultationListQuery): Promise<PaginatedResponse<any>> {
    const { page, limit, status, sortBy, sortOrder } = query;
    const where: any = { farmerId };
    if (status) where.status = status;
    const orderBy: any = sortBy === 'scheduledAt' ? { scheduledAt: sortOrder } : { createdAt: sortOrder };
    const skip = (page - 1) * limit;

    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({ where, include: { report: { include: { symptoms: true, prediction: true, cattle: true } }, vet: true }, orderBy, skip, take: limit }),
      prisma.consultation.count({ where }),
    ]);

    return { data: consultations, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findById(consultationId: string): Promise<any> {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { report: { include: { symptoms: true, photos: true, prediction: true, cattle: true } }, vet: true, farmer: true },
    });
    if (!consultation) throw new NotFoundError('Consultation');
    return consultation;
  }

  async update(consultationId: string, vetId: string, input: ConsultationUpdateInput): Promise<any> {
    const consultation = await prisma.consultation.findUnique({ where: { id: consultationId } });
    if (!consultation) throw new NotFoundError('Consultation');
    if (consultation.vetId !== vetId) throw new ForbiddenError('Not authorized');

    return prisma.consultation.update({
      where: { id: consultationId },
      data: { ...input, scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined, status: input.status || consultation.status },
      include: { report: { include: { symptoms: true, cattle: true } }, farmer: true },
    });
  }

  async addFeedback(consultationId: string, farmerId: string, rating: number, feedback?: string): Promise<any> {
    const consultation = await prisma.consultation.findUnique({ where: { id: consultationId } });
    if (!consultation) throw new NotFoundError('Consultation');
    if (consultation.farmerId !== farmerId) throw new ForbiddenError('Not authorized');

    const updated = await prisma.consultation.update({ where: { id: consultationId }, data: { farmerRating: rating, farmerFeedback: feedback } });

    const allFeedback = await prisma.consultation.findMany({ where: { vetId: consultation.vetId, farmerRating: { not: null } }, select: { farmerRating: true } });
    if (allFeedback.length > 0) {
      const avgRating = allFeedback.reduce((acc, c) => acc + (c.farmerRating || 0), 0) / allFeedback.length;
      await prisma.vetProfile.update({ where: { id: consultation.vetId }, data: { rating: avgRating, totalReviews: allFeedback.length } });
    }

    return updated;
  }
}

export const consultationService = new ConsultationService();