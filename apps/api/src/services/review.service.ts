import prisma from '../config/database.js';
import { AddPredictionReviewInput } from '../validators/index.js';
import { NotFoundError } from '../errors/index.js';

export class ReviewService {
  async createReview(vetId: string, input: AddPredictionReviewInput): Promise<any> {
    const reportId = input.reportId;
    if (!reportId) {
      throw new Error('Report ID is required');
    }

    let report = await prisma.healthReport.findUnique({
      where: { id: reportId },
      include: { prediction: true },
    });

    if (!report) {
      throw new NotFoundError('Health report');
    }

    let predictionId = report.prediction?.id;
    if (!predictionId) {
      const pred = await prisma.prediction.create({
        data: {
          reportId,
          predictionId: `PRED-${Date.now()}`,
          provider: 'manual',
          modelStatus: 'COMPLETED',
          isSimulated: false,
          predictedDisease: input.alternativeDiagnosis || input.suspectedDisease || 'Veterinary Review',
          disclaimer: 'Manual review by veterinarian',
          status: 'COMPLETED',
        },
      });
      predictionId = pred.id;
    }

    const diagnosed = input.diagnosedDisease || input.alternativeDiagnosis || input.suspectedDisease;

    const review = await prisma.predictionReview.create({
      data: {
        predictionId,
        vetId,
        decision: input.decision,
        confidence: input.confidence,
        notes: input.notes || input.remarks || input.clinicalFindings,
        alternativeDiagnosis: diagnosed,
        recommendedActions: input.recommendedActions || input.suggestedNextSteps,
      },
      include: {
        vet: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
      },
    });

    if (diagnosed) {
      await prisma.prediction.update({
        where: { id: predictionId },
        data: { predictedDisease: diagnosed },
      });
    }

    const newStatus = input.decision === 'AGREES_AI' || diagnosed ? 'CONFIRMED' : 'VET_REVIEWED';
    await prisma.healthReport.update({
      where: { id: reportId },
      data: { status: newStatus },
    });

    return review;
  }

  async getReviewForReport(reportId: string): Promise<any> {
    const review = await prisma.predictionReview.findFirst({
      where: {
        prediction: {
          reportId,
        },
      },
      include: {
        vet: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return review;
  }
}

export const reviewService = new ReviewService();
