import prisma from '../config/database.js';
import { CreateCattleInput, UpdateCattleInput, CattleListQuery, AddVaccinationInput } from '../validators/index.js';
import { NotFoundError, ForbiddenError } from '../errors/index.js';
import { PaginatedResponse } from '../types/index.js';

export class CattleService {
  async create(farmerId: string, input: CreateCattleInput): Promise<any> {
    const farm = await prisma.farm.findUnique({
      where: { farmerId },
    });

    if (!farm) {
      throw new NotFoundError('Farm not found. Please create a farm first.');
    }

    const existingCattle = await prisma.cattle.findFirst({
      where: { farmId: farm.id, tagNumber: input.tagNumber },
    });

    if (existingCattle) {
      throw new ForbiddenError('Cattle with this tag number already exists on this farm');
    }

    const cattle = await prisma.cattle.create({
      data: {
        farmId: farm.id,
        ownerId: farmerId,
        tagNumber: input.tagNumber,
        name: input.name,
        breed: input.breed,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        estimatedAge: input.estimatedAge,
        weight: input.weight,
        identificationMarks: input.identificationMarks,
        pregnancyStatus: input.pregnancyStatus,
      },
      include: {
        photos: true,
        vaccinations: true,
        farm: { select: { id: true, name: true } },
      },
    });

    return cattle;
  }

  async findAll(farmerId: string, query: CattleListQuery): Promise<PaginatedResponse<any>> {
    const { page, limit, search, breed, gender, pregnancyStatus, isActive, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      ownerId: farmerId,
    };

    if (search) {
      where.OR = [
        { tagNumber: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { breed: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (breed) where.breed = { contains: breed, mode: 'insensitive' };
    if (gender) where.gender = gender;
    if (pregnancyStatus) where.pregnancyStatus = pregnancyStatus;
    if (isActive !== undefined) where.isActive = isActive;

    const orderBy: any = {};
    if (sortBy === 'tagNumber' || sortBy === 'breed' || sortBy === 'createdAt' || sortBy === 'dateOfBirth') {
      orderBy[sortBy] = sortOrder;
    }

    const [cattle, total] = await Promise.all([
      prisma.cattle.findMany({
        where,
        include: {
          photos: { where: { isPrimary: true }, take: 1 },
          vaccinations: { orderBy: { dateGiven: 'desc' }, take: 5 },
          _count: { select: { healthReports: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.cattle.count({ where }),
    ]);

    return {
      data: cattle,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(cattleId: string, farmerId: string): Promise<any> {
    const cattle = await prisma.cattle.findFirst({
      where: { id: cattleId, ownerId: farmerId },
      include: {
        photos: true,
        vaccinations: { orderBy: { dateGiven: 'desc' } },
        healthReports: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            reportNumber: true,
            status: true,
            createdAt: true,
            prediction: {
              select: { predictedDisease: true, confidence: true },
            },
          },
        },
        farm: true,
      },
    });

    if (!cattle) {
      throw new NotFoundError('Cattle');
    }

    return cattle;
  }

  async update(cattleId: string, farmerId: string, input: UpdateCattleInput): Promise<any> {
    const cattle = await prisma.cattle.findFirst({
      where: { id: cattleId, ownerId: farmerId },
    });

    if (!cattle) {
      throw new NotFoundError('Cattle');
    }

    const updated = await prisma.cattle.update({
      where: { id: cattleId },
      data: {
        ...input,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      },
      include: {
        photos: true,
        vaccinations: { orderBy: { dateGiven: 'desc' }, take: 5 },
        farm: true,
      },
    });

    return updated;
  }

  async archive(cattleId: string, farmerId: string): Promise<void> {
    const cattle = await prisma.cattle.findFirst({
      where: { id: cattleId, ownerId: farmerId },
    });

    if (!cattle) {
      throw new NotFoundError('Cattle');
    }

    await prisma.cattle.update({
      where: { id: cattleId },
      data: { isActive: false, archivedAt: new Date() },
    });
  }

  async addVaccination(cattleId: string, farmerId: string, input: AddVaccinationInput): Promise<any> {
    const cattle = await prisma.cattle.findFirst({
      where: { id: cattleId, ownerId: farmerId },
    });

    if (!cattle) {
      throw new NotFoundError('Cattle');
    }

    const vaccination = await prisma.cattleVaccination.create({
      data: {
        cattleId,
        vaccineName: input.vaccineName,
        dateGiven: new Date(input.dateGiven),
        nextDueDate: input.nextDueDate ? new Date(input.nextDueDate) : undefined,
        notes: input.notes,
      },
    });

    return vaccination;
  }

  async getVaccinations(cattleId: string, farmerId: string): Promise<any[]> {
    const cattle = await prisma.cattle.findFirst({
      where: { id: cattleId, ownerId: farmerId },
    });

    if (!cattle) {
      throw new NotFoundError('Cattle');
    }

    return prisma.cattleVaccination.findMany({
      where: { cattleId },
      orderBy: { dateGiven: 'desc' },
    });
  }
}

export const cattleService = new CattleService();