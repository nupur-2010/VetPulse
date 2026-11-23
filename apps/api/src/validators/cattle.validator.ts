import { z } from 'zod';

export const createCattleSchema = z.object({
  body: z.object({
    tagNumber: z.string().min(1, 'Tag number is required'),
    name: z.string().optional(),
    breed: z.string().min(1, 'Breed is required'),
    gender: z.enum(['MALE', 'FEMALE']),
    dateOfBirth: z.string().datetime().optional(),
    estimatedAge: z.string().optional(),
    weight: z.number().positive().optional(),
    identificationMarks: z.string().optional(),
    pregnancyStatus: z.enum(['NOT_PREGNANT', 'PREGNANT', 'UNKNOWN']).default('UNKNOWN'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateCattleSchema = z.object({
  body: z.object({
    tagNumber: z.string().min(1).optional(),
    name: z.string().optional(),
    breed: z.string().min(1).optional(),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    dateOfBirth: z.string().datetime().optional(),
    estimatedAge: z.string().optional(),
    weight: z.number().positive().optional(),
    identificationMarks: z.string().optional(),
    pregnancyStatus: z.enum(['NOT_PREGNANT', 'PREGNANT', 'UNKNOWN']).optional(),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const cattleIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    cattleId: z.string().uuid('Invalid cattle ID'),
  }),
});

export const cattleListQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
    breed: z.string().optional(),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    pregnancyStatus: z.enum(['NOT_PREGNANT', 'PREGNANT', 'UNKNOWN']).optional(),
    isActive: z.coerce.boolean().optional(),
    sortBy: z.enum(['tagNumber', 'breed', 'createdAt', 'dateOfBirth']).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
  params: z.object({}).optional(),
});

export const addVaccinationSchema = z.object({
  body: z.object({
    vaccineName: z.string().min(1, 'Vaccine name is required'),
    dateGiven: z.string().datetime().min(1, 'Date given is required'),
    nextDueDate: z.string().datetime().optional(),
    notes: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    cattleId: z.string().uuid('Invalid cattle ID'),
  }),
});

export type CreateCattleInput = z.infer<typeof createCattleSchema>['body'];
export type UpdateCattleInput = z.infer<typeof updateCattleSchema>['body'];
export type CattleListQuery = z.infer<typeof cattleListQuerySchema>['query'];
export type AddVaccinationInput = z.infer<typeof addVaccinationSchema>['body'];