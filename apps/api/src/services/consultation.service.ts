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
    const report = await prisma.healthReport.findUnique({
      where: { id: reportId },
      include: { prediction: true },
    });
    if (!report) throw new NotFoundError('Health report');

    // Consultation requests are only permitted when confidence is medium or high (>= 0.4)
    if (report.prediction && report.prediction.confidence !== null && report.prediction.confidence !== undefined) {
      if (report.prediction.confidence < 0.4) {
        throw new ForbiddenError('Consultation requests can only be submitted for reports with medium or high AI confidence');
      }
    }

    // Check if consultation is already requested
    const existing = await prisma.consultation.findFirst({
      where: { reportId },
      include: {
        report: { include: { symptoms: true, photos: true, prediction: true, cattle: true } },
        vet: { select: { id: true, firstName: true, lastName: true, specialization: true } },
        farmer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    if (existing) {
      await prisma.healthReport.update({
        where: { id: reportId },
        data: { consultationRequested: true },
      });
      return existing;
    }

    // Match with a veterinarian from the same state
    let vet = await prisma.vetProfile.findFirst({
      where: {
        isAvailable: true,
        licenseState: { equals: report.state, mode: 'insensitive' },
      },
    });
    if (!vet) {
      vet = await prisma.vetProfile.findFirst({
        where: {
          licenseState: { equals: report.state, mode: 'insensitive' },
        },
      });
    }
    if (!vet) {
      vet = await prisma.vetProfile.findFirst({ where: { isAvailable: true } });
    }
    if (!vet) {
      vet = await prisma.vetProfile.findFirst();
    }
    if (!vet) {
      throw new NotFoundError('No veterinarian available');
    }

    const consultation = await prisma.consultation.create({
      data: {
        reportId,
        farmerId: report.farmerId,
        vetId: vet.id,
        status: 'REQUESTED',
        reason: notes || 'Consultation requested for health report',
      },
      include: {
        report: { include: { symptoms: true, photos: true, prediction: true, cattle: true } },
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
    const vet = await prisma.vetProfile.findUnique({ where: { id: vetId } });
    const vetState = vet?.licenseState;

    // Automatically sync any reports that have consultationRequested=true in this state
    try {
      const syncWhere: any = { consultationRequested: true, consultations: { none: {} } };
      if (vetState) {
        syncWhere.state = { equals: vetState, mode: 'insensitive' };
      }
      const unlinkedReports = await prisma.healthReport.findMany({
        where: syncWhere,
        include: { farmer: true },
      });

      for (const rep of unlinkedReports) {
        await prisma.consultation.create({
          data: {
            reportId: rep.id,
            farmerId: rep.farmerId,
            vetId,
            status: 'REQUESTED',
            reason: rep.additionalNotes || 'Consultation requested for health report',
          },
        });
      }
    } catch (e) {
      console.error('Error auto-syncing consultations for vet:', e);
    }

    const where: any = {};
    if (vetState) {
      where.OR = [
        { vetId },
        { report: { state: { equals: vetState, mode: 'insensitive' } } },
      ];
    } else {
      where.vetId = vetId;
    }
    if (status) where.status = status;
    const orderBy: any = sortBy === 'scheduledAt' ? { scheduledAt: sortOrder } : { createdAt: sortOrder };
    const skip = (page - 1) * limit;

    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({
        where,
        include: {
          report: {
            include: {
              symptoms: true,
              photos: true,
              prediction: {
                include: {
                  vetReviews: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                      vet: { select: { id: true, firstName: true, lastName: true, specialization: true } },
                    },
                  },
                },
              },
              cattle: true,
            },
          },
          farmer: true,
          vet: { select: { id: true, firstName: true, lastName: true, specialization: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.consultation.count({ where }),
    ]);

    const formattedConsultations = consultations.map((c) => {
      const item = c as any;
      if (item.report?.prediction?.vetReviews && item.report.prediction.vetReviews.length > 0) {
        item.report.vetReview = item.report.prediction.vetReviews[0];
        // If the report has been reviewed, the consultation is completed
        if (item.status === 'REQUESTED' || item.status === 'ACCEPTED') {
          item.status = 'COMPLETED';
        }
      }
      return item;
    });

    return { data: formattedConsultations, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findAllForFarmer(farmerId: string, query: ConsultationListQuery): Promise<PaginatedResponse<any>> {
    const { page, limit, status, sortBy, sortOrder } = query;
    const where: any = { farmerId };
    if (status) where.status = status;
    const orderBy: any = sortBy === 'scheduledAt' ? { scheduledAt: sortOrder } : { createdAt: sortOrder };
    const skip = (page - 1) * limit;

    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({
        where,
        include: {
          report: {
            include: {
              symptoms: true,
              photos: true,
              prediction: {
                include: {
                  vetReviews: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                      vet: { select: { id: true, firstName: true, lastName: true, specialization: true } },
                    },
                  },
                },
              },
              cattle: true,
            },
          },
          vet: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.consultation.count({ where }),
    ]);

    const formattedConsultations = consultations.map((c) => {
      const item = c as any;
      if (item.report?.prediction?.vetReviews && item.report.prediction.vetReviews.length > 0) {
        item.report.vetReview = item.report.prediction.vetReviews[0];
        if (item.status === 'REQUESTED' || item.status === 'ACCEPTED') {
          item.status = 'COMPLETED';
        }
      }
      return item;
    });

    return { data: formattedConsultations, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
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