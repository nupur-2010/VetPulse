import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import { RegisterInput, LoginInput } from '../validators/index.js';
import { UnauthorizedError, ConflictError, NotFoundError } from '../errors/index.js';
import { JwtPayload, AuthenticatedUser } from '../types/index.js';

export class AuthService {
  async register(input: RegisterInput): Promise<{ user: AuthenticatedUser; tokens: { accessToken: string; refreshToken: string } }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
        farmerProfile: input.role === 'FARMER' ? {
          create: {
            firstName: input.firstName!,
            lastName: input.lastName!,
            phone: input.phone,
            state: input.state!,
            district: input.district!,
            village: input.village,
            farm: {
              create: {
                name: `${input.firstName}'s Farm`,
                address: input.village ? `${input.village}, ${input.district}` : input.district,
              },
            },
          },
        } : undefined,
        vetProfile: input.role === 'VETERINARIAN' ? {
          create: {
            firstName: input.firstName || '',
            lastName: input.lastName || '',
            phone: input.phone,
            specialization: input.specialization,
            licenseNumber: input.licenseNumber,
            licenseState: input.licenseState || input.state || 'Maharashtra',
            yearsOfExperience: input.yearsOfExperience,
            clinicName: input.clinicName,
            clinicAddress: input.clinicAddress || (input.district ? `${input.district}, ${input.state}` : undefined),
          },
        } : undefined,
      },
      include: {
        farmerProfile: { select: { id: true } },
        vetProfile: { select: { id: true } },
      },
    });

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      farmerProfileId: user.farmerProfile?.id,
      vetProfileId: user.vetProfile?.id,
    };

    return { user: authenticatedUser, tokens };
  }

  async login(input: LoginInput): Promise<{ 
    user: AuthenticatedUser; 
    tokens: { accessToken: string; refreshToken: string };
    farmerProfile?: any;
    vetProfile?: any;
  }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        farmerProfile: true,
        vetProfile: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      farmerProfileId: user.farmerProfile?.id,
      vetProfileId: user.vetProfile?.id,
    };

    return { 
      user: authenticatedUser, 
      tokens,
      farmerProfile: user.farmerProfile ? {
        id: user.farmerProfile.id,
        firstName: user.farmerProfile.firstName,
        lastName: user.farmerProfile.lastName,
        phone: user.farmerProfile.phone || undefined,
        state: user.farmerProfile.state,
        district: user.farmerProfile.district,
        village: user.farmerProfile.village || undefined,
      } : undefined,
      vetProfile: user.vetProfile ? {
        id: user.vetProfile.id,
        userId: user.vetProfile.userId,
        firstName: user.vetProfile.firstName,
        lastName: user.vetProfile.lastName,
        phone: user.vetProfile.phone || undefined,
        specialization: user.vetProfile.specialization || undefined,
        licenseNumber: user.vetProfile.licenseNumber || undefined,
        licenseState: user.vetProfile.licenseState || undefined,
        yearsOfExperience: user.vetProfile.yearsOfExperience || undefined,
        clinicName: user.vetProfile.clinicName || undefined,
        clinicAddress: user.vetProfile.clinicAddress || undefined,
        consultationFee: user.vetProfile.consultationFee || undefined,
        rating: user.vetProfile.rating || undefined,
        totalReviews: user.vetProfile.totalReviews,
        isAvailable: user.vetProfile.isAvailable,
      } : undefined,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } }).catch(() => {});
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedError('User account is disabled');
    }

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const tokens = await this.generateTokens(storedToken.user);
    await this.saveRefreshToken(storedToken.user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await this.logoutAll(userId);
  }

  async getUserById(userId: string): Promise<AuthenticatedUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        farmerProfile: { select: { id: true, firstName: true, lastName: true, state: true, district: true } },
        vetProfile: { select: { id: true, firstName: true, lastName: true, specialization: true } },
      },
    });

    if (!user || !user.isActive) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      farmerProfileId: user.farmerProfile?.id,
      vetProfileId: user.vetProfile?.id,
    };
  }

  private async generateTokens(user: { id: string; email: string; role: string }): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as any,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });

    const refreshToken = uuidv4();

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    const daysMatch = typeof config.jwt.refreshExpiresIn === 'string' && config.jwt.refreshExpiresIn.match(/^(\d+)d$/);
    const days = daysMatch ? parseInt(daysMatch[1], 10) : 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    await prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }
}

export const authService = new AuthService();