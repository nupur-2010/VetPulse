import { Request } from 'express';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  farmerProfileId?: string;
  vetProfileId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface DiseaseCase {
  id: string;
  reportNumber: string;
  disease: string;
  confidence: number;
  state: string;
  district: string;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
}

export interface ClusterCase {
  reportId: string;
  reportNumber: string;
  disease: string;
  confidence: number;
  latitude: number;
  longitude: number;
  createdAt: Date;
  distance: number;
}