import prisma from '../config/database.js';
import { VetListQuery } from '../validators/index.js';
import { NotFoundError } from '../errors/index.js';
import { PaginatedResponse } from '../types/index.js';

export class VeterinarianService {
  async findAll(query: VetListQuery): Promise<PaginatedResponse<any>> {
    const { page, limit, state, district, specialization, isAvailable, minRating, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (isAvailable !== undefined) where.isAvailable = isAvailable;
    if (specialization) where.specialization = { contains: specialization, mode: 'insensitive' };
    if (minRating) where.rating = { gte: minRating };

    const orderBy: any = {};
    if (sortBy === 'rating') orderBy.rating = sortOrder === 'desc' ? 'desc' : 'asc';
    else if (sortBy === 'totalReviews') orderBy.totalReviews = sortOrder;
    else if (sortBy === 'consultationFee') orderBy.consultationFee = sortOrder;
    else orderBy.createdAt = sortOrder;

    const [vets, total] = await Promise.all([
      prisma.vetProfile.findMany({
        where,
        select: {
          id: true, firstName: true, lastName: true, specialization: true, clinicName: true,
          clinicAddress: true, consultationFee: true, rating: true, totalReviews: true,
          isAvailable: true, yearsOfExperience: true,
          user: { select: { email: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.vetProfile.count({ where }),
    ]);

    return { data: vets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findById(vetId: string): Promise<any> {
    const vet = await prisma.vetProfile.findUnique({
      where: { id: vetId },
      include: {
        user: { select: { email: true } },
        availability: true,
        reviews: { orderBy: { createdAt: 'desc' }, take: 10, include: { prediction: { include: { report: { select: { cattle: { select: { tagNumber: true, name: true } } } } } } } },
      },
    });
    if (!vet) throw new NotFoundError('Veterinarian');
    return vet;
  }

  async updateProfile(vetId: string, input: any): Promise<any> {
    return prisma.vetProfile.update({
      where: { id: vetId },
      data: input,
      select: { id: true, firstName: true, lastName: true, specialization: true, clinicName: true, isAvailable: true },
    });
  }

  async setAvailability(vetId: string, input: any): Promise<any> {
    const existing = await prisma.vetAvailability.findFirst({ where: { vetId, dayOfWeek: input.dayOfWeek } });
    if (existing) {
      return prisma.vetAvailability.update({
        where: { id: existing.id },
        data: { startTime: input.startTime, endTime: input.endTime, isAvailable: input.isAvailable },
      });
    }
    return prisma.vetAvailability.create({
      data: { vetId, dayOfWeek: input.dayOfWeek, startTime: input.startTime, endTime: input.endTime, isAvailable: input.isAvailable },
    });
  }

  async getAvailability(vetId: string): Promise<any[]> {
    return prisma.vetAvailability.findMany({ where: { vetId }, orderBy: { dayOfWeek: 'asc' } });
  }
}

export const veterinarianService = new VeterinarianService();