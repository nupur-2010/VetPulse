import { z } from 'zod';

const symptomSchema = z.object({
  symptomName: z.string().min(1, 'Symptom name is required'),
  symptomGroup: z.string().min(1, 'Symptom group is required'),
});

export const createHealthReportSchema = z.object({
  body: z.object({
    cattleId: z.string().uuid('Invalid cattle ID'),
    state: z.string().min(1, 'State is required'),
    district: z.string().min(1, 'District is required'),
    village: z.string().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    location: z.string().optional(),
    temperature: z.number().min(35).max(45).optional(),
    symptomDuration: z.string().min(1, 'Symptom duration is required'),
    severity: z.enum(['mild', 'moderate', 'severe']).default('mild'),
    milkProductionChange: z.string().optional(),
    waterIntakeChange: z.string().optional(),
    recentVaccination: z.string().optional(),
    recentIllness: z.string().optional(),
    recentTreatment: z.string().optional(),
    additionalNotes: z.string().optional(),
    consultationRequested: z.boolean().default(false),
    symptoms: z.array(symptomSchema).min(1, 'At least one symptom is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateHealthReportSchema = z.object({
  body: z.object({
    state: z.string().min(1).optional(),
    district: z.string().min(1).optional(),
    village: z.string().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    location: z.string().optional(),
    temperature: z.number().min(35).max(45).optional(),
    symptomDuration: z.string().min(1).optional(),
    severity: z.enum(['mild', 'moderate', 'severe']).optional(),
    milkProductionChange: z.string().optional(),
    waterIntakeChange: z.string().optional(),
    recentVaccination: z.string().optional(),
    recentIllness: z.string().optional(),
    recentTreatment: z.string().optional(),
    additionalNotes: z.string().optional(),
    consultationRequested: z.boolean().optional(),
    status: z.enum(['PENDING', 'AI_COMPLETED', 'VET_REVIEWED', 'CONFIRMED']).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    reportId: z.string().uuid('Invalid report ID'),
  }),
});

export const reportIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    reportId: z.string().uuid('Invalid report ID'),
  }),
});

export const reportListQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(['PENDING', 'AI_COMPLETED', 'VET_REVIEWED', 'CONFIRMED']).optional(),
    state: z.string().optional(),
    district: z.string().optional(),
    disease: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'status']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
  params: z.object({}).optional(),
});

export const addPredictionReviewSchema = z.object({
  body: z.object({
    decision: z.enum(['AGREES_AI', 'DISAGREES_AI', 'INCONCLUSIVE', 'ALTERNATIVE_DISEASE', 'NEEDS_EXAMINATION']),
    confidence: z.number().min(0).max(1).optional(),
    notes: z.string().optional(),
    alternativeDiagnosis: z.string().optional(),
    recommendedActions: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    reportId: z.string().uuid('Invalid report ID'),
  }),
});

export type CreateHealthReportInput = z.infer<typeof createHealthReportSchema>['body'];
export type UpdateHealthReportInput = z.infer<typeof updateHealthReportSchema>['body'];
export type ReportListQuery = z.infer<typeof reportListQuerySchema>['query'];
export type AddPredictionReviewInput = z.infer<typeof addPredictionReviewSchema>['body'];