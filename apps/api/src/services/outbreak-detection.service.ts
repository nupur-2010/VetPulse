import prisma from '../config/database.js';

const EARTH_RADIUS_KM = 6371;
const CLUSTER_RADIUS_KM = 10;
const MIN_CASES_FOR_CLUSTER = 3;

export class OutbreakDetectionService {
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
  }

  async detectClusters(): Promise<any[]> {
    const recentReports = await prisma.healthReport.findMany({
      where: { status: { in: ['AI_COMPLETED', 'VET_REVIEWED', 'CONFIRMED'] }, latitude: { not: null }, longitude: { not: null } },
      include: { prediction: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const cases: any[] = recentReports.filter(r => r.prediction?.predictedDisease && r.latitude && r.longitude).map(r => ({
      id: r.id, reportNumber: r.reportNumber, disease: r.prediction!.predictedDisease!, lat: r.latitude!, lng: r.longitude!, createdAt: r.createdAt,
    }));

    const clusters: any[] = [];
    const clustered = new Set<string>();

    for (const c of cases) {
      if (clustered.has(c.id)) continue;
      const nearby = cases.filter(other => other.id !== c.id && other.disease === c.disease && this.calculateDistance(c.lat, c.lng, other.lat, other.lng) <= CLUSTER_RADIUS_KM);
      
      if (nearby.length + 1 >= MIN_CASES_FOR_CLUSTER) {
        const clusterCases = [c, ...nearby];
        const avgLat = clusterCases.reduce((s, c) => s + c.lat, 0) / clusterCases.length;
        const avgLng = clusterCases.reduce((s, c) => s + c.lng, 0) / clusterCases.length;
        
        clusters.push({
          disease: c.disease, centerLatitude: avgLat, centerLongitude: avgLng, radiusKm: CLUSTER_RADIUS_KM,
          firstReportAt: new Date(Math.min(...clusterCases.map(c => c.createdAt.getTime()))),
          lastReportAt: new Date(Math.max(...clusterCases.map(c => c.createdAt.getTime()))),
          reportCount: clusterCases.length,
          reportIds: clusterCases.map(c => c.id),
          status: 'POTENTIAL',
        });
        
        clusterCases.forEach(cc => clustered.add(cc.id));
      }
    }

    // Save new clusters to DB
    for (const cluster of clusters) {
      const existing = await prisma.diseaseCluster.findFirst({
        where: { disease: cluster.disease, centerLatitude: { gte: cluster.centerLatitude - 0.1, lte: cluster.centerLatitude + 0.1 }, centerLongitude: { gte: cluster.centerLongitude - 0.1, lte: cluster.centerLongitude + 0.1 } },
      });
      
      if (!existing) {
        await prisma.diseaseCluster.create({ data: cluster });
      }
    }

    return clusters;
  }

  async getHighRiskAreas(): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reports = await prisma.healthReport.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, status: { in: ['AI_COMPLETED', 'VET_REVIEWED', 'CONFIRMED'] } },
      include: { prediction: true },
    });

    const byLocation: Record<string, any> = {};
    for (const report of reports) {
      const key = `${report.state}-${report.district}`;
      if (!byLocation[key]) byLocation[key] = { state: report.state, district: report.district, count: 0, diseases: new Set() };
      byLocation[key].count++;
      if (report.prediction?.predictedDisease) byLocation[key].diseases.add(report.prediction.predictedDisease);
    }

    return Object.values(byLocation).filter((l: any) => l.count >= 5).map((l: any) => ({ ...l, uniqueDiseases: l.diseases.size, diseaseList: Array.from(l.diseases) })).sort((a: any, b: any) => b.count - a.count);
  }

  async generateAlerts(): Promise<any[]> {
    const clusters = await prisma.diseaseCluster.findMany({ where: { status: 'POTENTIAL', reportCount: { gte: MIN_CASES_FOR_CLUSTER } } });
    const alerts: any[] = [];

    for (const cluster of clusters) {
      const severity = cluster.reportCount >= 10 ? 'CRITICAL' : cluster.reportCount >= 5 ? 'HIGH' : 'MEDIUM';
      const existingAlert = await prisma.outbreakAlert.findFirst({ where: { disease: cluster.disease, isActive: true } });
      
      if (!existingAlert) {
        const alert = await prisma.outbreakAlert.create({
          data: {
            clusterId: cluster.id, disease: cluster.disease, severity, state: 'Multiple', district: 'Multiple',
            message: `Potential ${cluster.disease} outbreak detected with ${cluster.reportCount} cases in a ${cluster.radiusKm}km radius. First report: ${cluster.firstReportAt.toLocaleDateString()}.`,
            recommendations: ['Increase surveillance in the area', 'Alert local veterinarians', 'Review biosecurity measures', 'Prepare response resources'],
          },
        });
        alerts.push(alert);
      }
    }

    return alerts;
  }
}

export const outbreakDetectionService = new OutbreakDetectionService();