import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  disease: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'district', 'disease', 'state']).default('day'),
});

export const clusterQuerySchema = z.object({
  disease: z.string().optional(),
  status: z.enum(['POTENTIAL', 'UNDER_INVESTIGATION', 'SUSPECTED_OUTBREAK', 'LAB_CONFIRMED', 'DISMISSED']).optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  minReports: z.coerce.number().int().nonnegative().optional(),
});

export const outbreakAlertSchema = z.object({
  disease: z.string().min(1, 'Disease is required'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  state: z.string().min(1, 'State is required'),
  district: z.string().min(1, 'District is required'),
  message: z.string().min(1, 'Message is required'),
  recommendations: z.array(z.string()).optional(),
  clusterId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const userManagementQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(['FARMER', 'VETERINARIAN', 'ADMIN']).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export const clusterIdSchema = z.object({
  clusterId: z.string().uuid('Invalid cluster ID'),
});

export const alertIdSchema = z.object({
  alertId: z.string().uuid('Invalid alert ID'),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type ClusterQuery = z.infer<typeof clusterQuerySchema>;
export type OutbreakAlertInput = z.infer<typeof outbreakAlertSchema>;
export type UserManagementQuery = z.infer<typeof userManagementQuerySchema>;
