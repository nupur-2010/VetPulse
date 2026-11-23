import { z } from 'zod';

export const vetProfileUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
  yearsOfExperience: z.number().int().nonnegative().optional(),
  clinicName: z.string().optional(),
  clinicAddress: z.string().optional(),
  consultationFee: z.number().nonnegative().optional(),
  isAvailable: z.boolean().optional(),
});

export const vetAvailabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  isAvailable: z.boolean().default(true),
});

export const vetListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  state: z.string().optional(),
  district: z.string().optional(),
  specialization: z.string().optional(),
  isAvailable: z.coerce.boolean().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sortBy: z.enum(['rating', 'totalReviews', 'consultationFee', 'createdAt']).default('rating'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const vetIdSchema = z.object({
  vetId: z.string().uuid('Invalid vet ID'),
});

export type VetProfileUpdateInput = z.infer<typeof vetProfileUpdateSchema>;
export type VetAvailabilityInput = z.infer<typeof vetAvailabilitySchema>;
export type VetListQuery = z.infer<typeof vetListQuerySchema>;
