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
            licenseState: input.licenseState,
            yearsOfExperience: input.yearsOfExperience,
            clinicName: input.clinicName,
            clinicAddress: input.clinicAddress,
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
    farmerProfile?: { id: string; firstName: string; lastName: string } | null;
    vetProfile?: { id: string; firstName: string; specialization: string | null } | null;
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
      } : undefined,
      vetProfile: user.vetProfile ? {
        id: user.vetProfile.id,
        firstName: user.vetProfile.firstName,
        specialization: user.vetProfile.specialization,
      } : undefined,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
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
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }
}

export const authService = new AuthService();