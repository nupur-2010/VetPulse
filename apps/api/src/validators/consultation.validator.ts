import { z } from 'zod';

export const consultationRequestSchema = z.object({
  reportId: z.string().uuid('Invalid report ID'),
  reason: z.string().min(1, 'Reason is required'),
  preferredDate: z.string().datetime().optional(),
});

export const consultationUpdateSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'COMPLETED', 'CLOSED']).optional(),
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().int().positive().optional(),
  findings: z.string().optional(),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  medications: z.string().optional(),
  followUpDate: z.string().datetime().optional(),
});

export const consultationFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  feedback: z.string().optional(),
});

export const consultationIdSchema = z.object({
  consultationId: z.string().uuid('Invalid consultation ID'),
});

export const consultationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['REQUESTED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CLOSED']).optional(),
  sortBy: z.enum(['createdAt', 'scheduledAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ConsultationRequestInput = z.infer<typeof consultationRequestSchema>;
export type ConsultationUpdateInput = z.infer<typeof consultationUpdateSchema>;
export type ConsultationFeedbackInput = z.infer<typeof consultationFeedbackSchema>;
export type ConsultationListQuery = z.infer<typeof consultationListQuerySchema>;
