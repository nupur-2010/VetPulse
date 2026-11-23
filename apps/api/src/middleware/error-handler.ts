import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/index.js';

interface ErrorResponse {
  success: boolean;
  error: {
    message: string;
    code?: string;
    details?: Record<string, string[]>;
  };
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        message: err.message,
        code: err.code,
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    if (prismaError.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: {
          message: 'A record with this value already exists',
          code: 'DUPLICATE_ENTRY',
        },
      });
      return;
    }
    
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: {
          message: 'Record not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
      code: 'INTERNAL_SERVER_ERROR',
    },
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
    },
  });
};