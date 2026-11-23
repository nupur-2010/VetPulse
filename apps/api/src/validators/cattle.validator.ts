import { z } from 'zod';

const optionalDate = z.preprocess((val) => {
  if (!val || val === '') return undefined;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return val;
}, z.string().datetime().optional());

const optionalNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
}, z.number().positive().optional());

const optionalString = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  return String(val);
}, z.string().optional());

export const createCattleSchema = z.object({
  tagNumber: z.string().min(1, 'Tag number is required'),
  name: optionalString,
  breed: z.string().min(1, 'Breed is required'),
  gender: z.enum(['MALE', 'FEMALE']),
  dateOfBirth: optionalDate,
  estimatedAge: optionalString,
  weight: optionalNumber,
  identificationMarks: optionalString,
  pregnancyStatus: z.enum(['NOT_PREGNANT', 'PREGNANT', 'UNKNOWN']).default('UNKNOWN'),
});

export const updateCattleSchema = z.object({
  tagNumber: z.string().min(1).optional(),
  name: optionalString,
  breed: z.string().min(1).optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  dateOfBirth: optionalDate,
  estimatedAge: optionalString,
  weight: optionalNumber,
  identificationMarks: optionalString,
  pregnancyStatus: z.enum(['NOT_PREGNANT', 'PREGNANT', 'UNKNOWN']).optional(),
  isActive: z.boolean().optional(),
});

export const cattleIdSchema = z.object({
  cattleId: z.string().uuid('Invalid cattle ID'),
});

export const cattleListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  breed: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  pregnancyStatus: z.enum(['NOT_PREGNANT', 'PREGNANT', 'UNKNOWN']).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['tagNumber', 'breed', 'createdAt', 'dateOfBirth']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const addVaccinationSchema = z.object({
  vaccineName: z.string().min(1, 'Vaccine name is required'),
  dateGiven: z.preprocess((val) => {
    if (typeof val === 'string' && val.length > 0) {
      const d = new Date(val);
      return isNaN(d.getTime()) ? val : d.toISOString();
    }
    return val;
  }, z.string().datetime()),
  nextDueDate: optionalDate,
  notes: optionalString,
});

export type CreateCattleInput = z.infer<typeof createCattleSchema>;
export type UpdateCattleInput = z.infer<typeof updateCattleSchema>;
export type CattleListQuery = z.infer<typeof cattleListQuerySchema>;
export type AddVaccinationInput = z.infer<typeof addVaccinationSchema>;
