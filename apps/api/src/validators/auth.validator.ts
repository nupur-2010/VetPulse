import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    role: z.enum(['FARMER', 'VETERINARIAN']).default('FARMER'),
    // Farmer profile fields
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    phone: z.string().optional(),
    state: z.string().min(1, 'State is required').optional(),
    district: z.string().min(1, 'District is required').optional(),
    village: z.string().optional(),
    // Vet profile fields
    specialization: z.string().optional(),
    licenseNumber: z.string().optional(),
    licenseState: z.string().optional(),
    yearsOfExperience: z.number().int().optional(),
    clinicName: z.string().optional(),
    clinicAddress: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
}).refine(
  (data) => {
    if (data.body.role === 'FARMER') {
      return data.body.firstName && data.body.lastName && data.body.state && data.body.district;
    }
    return true;
  },
  {
    message: 'Farmer profile requires firstName, lastName, state, and district',
    path: ['body'],
  }
);

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];