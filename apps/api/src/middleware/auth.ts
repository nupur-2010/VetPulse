import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { JwtPayload, AuthenticatedUser } from '../types/index.js';
import { UnauthorizedError } from '../errors/index.js';
import prisma from '../config/database.js';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      
      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          farmerProfile: { select: { id: true } },
          vetProfile: { select: { id: true } },
        },
      });
      
      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or inactive');
      }
      
      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        farmerProfileId: user.farmerProfile?.id,
        vetProfileId: user.vetProfile?.id,
      };
      
      req.user = authenticatedUser;
      next();
    } catch (jwtError) {
      if (jwtError instanceof UnauthorizedError) throw jwtError;
      throw new UnauthorizedError('Invalid or expired token');
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Not authenticated'));
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      next(new UnauthorizedError('Insufficient permissions'));
      return;
    }
    
    next();
  };
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          farmerProfile: { select: { id: true } },
          vetProfile: { select: { id: true } },
        },
      });
      
      if (user && user.isActive) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          farmerProfileId: user.farmerProfile?.id,
          vetProfileId: user.vetProfile?.id,
        };
      }
    } catch {
      // Ignore JWT errors for optional auth
    }
    
    next();
  } catch (error) {
    next(error);
  }
};