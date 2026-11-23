import { z } from 'zod';

const symptomItemSchema = z.union([
  z.object({
    symptomName: z.string().min(1, 'Symptom name is required'),
    symptomGroup: z.string().default('General'),
  }),
  z.string().min(1).transform(s => ({ symptomName: s, symptomGroup: 'General' })),
]);

export const createHealthReportSchema = z.object({
  cattleId: z.string().uuid('Invalid cattle ID'),
  state: z.string().min(1, 'State is required'),
  district: z.string().min(1, 'District is required'),
  village: z.string().optional().nullable().transform(v => v || undefined),
  latitude: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().min(-90).max(90).optional()),
  longitude: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().min(-180).max(180).optional()),
  location: z.string().optional().nullable().transform(v => v || undefined),
  temperature: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().min(35).max(45).optional()),
  symptomDuration: z.string().min(1, 'Symptom duration is required'),
  severity: z.preprocess((val) => {
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      if (['mild', 'moderate', 'severe', 'critical'].includes(lower)) return lower;
    }
    return val || 'mild';
  }, z.string().default('mild')),
  milkProductionChange: z.string().optional().nullable().transform(v => v || undefined),
  waterIntakeChange: z.string().optional().nullable().transform(v => v || undefined),
  recentVaccination: z.string().optional().nullable().transform(v => v || undefined),
  recentIllness: z.string().optional().nullable().transform(v => v || undefined),
  recentTreatment: z.string().optional().nullable().transform(v => v || undefined),
  additionalNotes: z.string().optional().nullable().transform(v => v || undefined),
  consultationRequested: z.preprocess((val) => val === true || val === 'true', z.boolean().default(false)),
  symptoms: z.preprocess((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return [val];
      }
    }
    return val;
  }, z.array(symptomItemSchema).min(1, 'At least one symptom is required')),
});

export const updateHealthReportSchema = z.object({
  state: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  village: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  location: z.string().optional(),
  temperature: z.number().min(35).max(45).optional(),
  symptomDuration: z.string().min(1).optional(),
  severity: z.string().optional(),
  milkProductionChange: z.string().optional(),
  waterIntakeChange: z.string().optional(),
  recentVaccination: z.string().optional(),
  recentIllness: z.string().optional(),
  recentTreatment: z.string().optional(),
  additionalNotes: z.string().optional(),
  consultationRequested: z.boolean().optional(),
  status: z.enum(['PENDING', 'AI_COMPLETED', 'VET_REVIEWED', 'CONFIRMED']).optional(),
});

export const reportIdSchema = z.object({
  reportId: z.string().uuid('Invalid report ID'),
});

export const reportListQuerySchema = z.object({
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
});

export const addPredictionReviewSchema = z.object({
  reportId: z.string().uuid('Invalid report ID').optional(),
  decision: z.enum(['AGREES_AI', 'DISAGREES_AI', 'INCONCLUSIVE', 'ALTERNATIVE_DISEASE', 'NEEDS_EXAMINATION']),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  remarks: z.string().optional(),
  alternativeDiagnosis: z.string().optional(),
  suspectedDisease: z.string().optional(),
  recommendedActions: z.string().optional(),
  suggestedNextSteps: z.string().optional(),
  clinicalFindings: z.string().optional(),
  treatmentInfo: z.string().optional(),
  followUpDate: z.string().optional(),
});

export type CreateHealthReportInput = z.infer<typeof createHealthReportSchema>;
export type UpdateHealthReportInput = z.infer<typeof updateHealthReportSchema>;
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;
export type AddPredictionReviewInput = z.infer<typeof addPredictionReviewSchema>;
