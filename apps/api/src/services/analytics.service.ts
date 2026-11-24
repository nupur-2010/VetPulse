import prisma from '../config/database.js';
import { AnalyticsQuery, ClusterQuery, OutbreakAlertInput, UserManagementQuery } from '../validators/index.js';
import { NotFoundError } from '../errors/index.js';
import { outbreakDetectionService } from './outbreak-detection.service.js';

export class AnalyticsService {
  async getReportStats(query: AnalyticsQuery): Promise<any> {
    const { startDate, endDate, state, district, disease, groupBy } = query;
    const where: any = {};
    if (startDate || endDate) { where.createdAt = {}; if (startDate) where.createdAt.gte = new Date(startDate); if (endDate) where.createdAt.lte = new Date(endDate); }
    if (state) where.state = state;
    if (district) where.district = district;

    const reports = await prisma.healthReport.findMany({ where, include: { prediction: true }, orderBy: { createdAt: 'asc' } });

    const grouped: Record<string, any[]> = {};
    for (const report of reports) {
      const date = report.createdAt;
      let key = groupBy === 'month' ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : groupBy === 'district' ? report.district : groupBy === 'state' ? report.state : groupBy === 'disease' ? (report.prediction?.predictedDisease || 'Unknown') : date.toISOString().split('T')[0];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(report);
    }

    return Object.entries(grouped).map(([key, items]) => ({
      label: key, total: items.length, pending: items.filter(r => r.status === 'PENDING').length,
      aiCompleted: items.filter(r => r.status === 'AI_COMPLETED').length, vetReviewed: items.filter(r => r.status === 'VET_REVIEWED').length, confirmed: items.filter(r => r.status === 'CONFIRMED').length,
    }));
  }

  async getDiseaseBreakdown(query: AnalyticsQuery): Promise<any[]> {
    const { startDate, endDate, state, district } = query;
    const where: any = {};
    if (startDate || endDate) { where.createdAt = {}; if (startDate) where.createdAt.gte = new Date(startDate); if (endDate) where.createdAt.lte = new Date(endDate); }
    if (state) where.state = state;
    if (district) where.district = district;

    const reports = await prisma.healthReport.findMany({ where, include: { prediction: true } });
    const breakdown: Record<string, number> = {};
    for (const report of reports) { const disease = report.prediction?.predictedDisease || 'Unknown'; breakdown[disease] = (breakdown[disease] || 0) + 1; }
    return Object.entries(breakdown).map(([disease, count]) => ({ disease, count })).sort((a, b) => b.count - a.count);
  }

  async getGeographicStats(query: AnalyticsQuery): Promise<any[]> {
    const { startDate, endDate, disease } = query;
    const where: any = { status: { in: ['AI_COMPLETED', 'VET_REVIEWED', 'CONFIRMED'] } };
    if (startDate || endDate) { where.createdAt = {}; if (startDate) where.createdAt.gte = new Date(startDate); if (endDate) where.createdAt.lte = new Date(endDate); }
    if (disease) where.prediction = { predictedDisease: disease };

    const reports = await prisma.healthReport.findMany({ where, select: { state: true, district: true, latitude: true, longitude: true } });
    const geoMap: Record<string, any> = {};
    for (const report of reports) {
      const key = `${report.state}-${report.district}`;
      if (!geoMap[key]) geoMap[key] = { state: report.state, district: report.district, count: 0, lat: report.latitude || 0, lng: report.longitude || 0 };
      geoMap[key].count++;
    }
    return Object.values(geoMap);
  }

  async getAllClusters(query: ClusterQuery): Promise<any[]> {
    const { disease, status, minReports } = query;
    const where: any = {};
    if (disease) where.disease = disease;
    if (status) where.status = status;

    let clusters = await prisma.diseaseCluster.findMany({ where, orderBy: { lastReportAt: 'desc' } });

    // Lazily run DBSCAN so the map shows clusters without a manual trigger on first load.
    if (clusters.length === 0) {
      await outbreakDetectionService.detectClusters();
      clusters = await prisma.diseaseCluster.findMany({ where, orderBy: { lastReportAt: 'desc' } });
    }

    if (minReports) return clusters.filter(c => c.reportCount >= minReports);
    return clusters;
  }

  async getClusterById(clusterId: string): Promise<any> {
    const cluster = await prisma.diseaseCluster.findUnique({ where: { id: clusterId } });
    if (!cluster) throw new NotFoundError('Cluster');
    return cluster;
  }

  async updateClusterStatus(clusterId: string, status: string, notes?: string, investigatedBy?: string): Promise<any> {
    return prisma.diseaseCluster.update({ where: { id: clusterId }, data: { status: status as any, notes, investigatedBy, investigatedAt: new Date() } });
  }

  async createOutbreakAlert(input: OutbreakAlertInput): Promise<any> {
    return prisma.outbreakAlert.create({
      data: { disease: input.disease, severity: input.severity, state: input.state, district: input.district, message: input.message, recommendations: input.recommendations || [], clusterId: input.clusterId, expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined },
    });
  }

  async getActiveAlerts(state?: string, district?: string): Promise<any[]> {
    const where: any = { isActive: true };
    if (state) where.state = state;
    if (district) where.district = district;
    return prisma.outbreakAlert.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getUsers(query: UserManagementQuery): Promise<any> {
    const { page, limit, role, isActive, search } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) where.email = { contains: search, mode: 'insensitive' };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          farmerProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              address: true,
              state: true,
              district: true,
              village: true,
              createdAt: true,
            },
          },
          vetProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              specialization: true,
              licenseNumber: true,
              licenseState: true,
              yearsOfExperience: true,
              clinicName: true,
              clinicAddress: true,
              consultationFee: true,
              rating: true,
              totalReviews: true,
              isAvailable: true,
              createdAt: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);
    return { data: users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { isActive } });
  }

  async getDashboardStats(): Promise<any> {
    const [totalUsers, totalReports, totalCattle, totalVets, pendingReports, confirmedReports] = await Promise.all([
      prisma.user.count(), prisma.healthReport.count(), prisma.cattle.count(), prisma.vetProfile.count(),
      prisma.healthReport.count({ where: { status: 'PENDING' } }), prisma.healthReport.count({ where: { status: 'CONFIRMED' } }),
    ]);
    return { totalUsers, totalReports, totalCattle, totalVets, pendingReports, confirmedReports };
  }
}

export const analyticsService = new AnalyticsService();