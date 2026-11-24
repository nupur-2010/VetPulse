import prisma from '../config/database.js';

const EARTH_RADIUS_KM = 6371;
const CLUSTER_RADIUS_KM = 5; // DBSCAN eps (km) - localized epidemiological containment zone
const MIN_CASES_FOR_CLUSTER = 3; // DBSCAN minPts - minimum 3 cases to form a low-severity cluster

interface GeoPoint {
  id: string;
  reportNumber: string;
  disease: string;
  lat: number;
  lng: number;
  district?: string;
  state?: string;
  createdAt: Date;
}

interface Cluster {
  name: string;
  disease: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  firstReportAt: Date;
  lastReportAt: Date;
  reportCount: number;
  reportIds: string[];
  status: string;
  severity: string;
  district?: string;
  state?: string;
}

/**
 * Proper DBSCAN (Density-Based Spatial Clustering of Applications with Noise).
 * Uses haversine distance (km) as the metric with eps = CLUSTER_RADIUS_KM and
 * minPts = MIN_CASES_FOR_CLUSTER. Transitive neighborhood expansion is applied.
 */
export class OutbreakDetectionService {
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
  }

  private dbscan(points: GeoPoint[], epsKm: number, minPts: number): GeoPoint[][] {
    const clusters: GeoPoint[][] = [];
    const visited = new Set<string>();
    const clustered = new Set<string>();
    let noise: GeoPoint[] = [];

    for (const point of points) {
      if (visited.has(point.id)) continue;
      visited.add(point.id);

      const neighbors = this.regionQuery(points, point, epsKm);

      // DBSCAN core point: point itself + its neighbors must be >= minPts
      if (neighbors.length + 1 < minPts) {
        noise.push(point);
        continue;
      }

      const cluster: GeoPoint[] = [];
      this.expandCluster(point, neighbors, points, epsKm, minPts, visited, clustered, cluster);
      clusters.push(cluster);
    }

    return clusters;
  }

  private regionQuery(points: GeoPoint[], point: GeoPoint, epsKm: number): GeoPoint[] {
    return points.filter(
      (p) => p.id !== point.id && this.calculateDistanceKm(p.lat, p.lng, point.lat, point.lng) <= epsKm
    );
  }

  private expandCluster(
    seed: GeoPoint,
    neighbors: GeoPoint[],
    points: GeoPoint[],
    epsKm: number,
    minPts: number,
    visited: Set<string>,
    clustered: Set<string>,
    cluster: GeoPoint[]
  ): void {
    cluster.push(seed);
    clustered.add(seed.id);

    const seedQueue = [...neighbors];
    while (seedQueue.length > 0) {
      const current = seedQueue.pop()!;
      if (!visited.has(current.id)) {
        visited.add(current.id);
        const currentNeighbors = this.regionQuery(points, current, epsKm);
        // Core point check includes the point itself
        if (currentNeighbors.length + 1 >= minPts) {
          for (const n of currentNeighbors) {
            if (!clustered.has(n.id)) seedQueue.push(n);
          }
        }
      }
      if (!clustered.has(current.id)) {
        cluster.push(current);
        clustered.add(current.id);
      }
    }
  }

  private buildCluster(cases: GeoPoint[], forcedStatus?: string): Cluster {
    const avgLat = cases.reduce((sum, c) => sum + c.lat, 0) / cases.length;
    const avgLng = cases.reduce((sum, c) => sum + c.lng, 0) / cases.length;
    // Conservative coverage: max distance from centroid to any member provides the circle radius.
    const maxDist = Math.max(
      ...cases.map((c) => this.calculateDistanceKm(avgLat, avgLng, c.lat, c.lng))
    );

    const count = cases.length;
    const severity = count >= 10 ? 'CRITICAL' : count >= 6 ? 'HIGH' : count >= 4 ? 'MEDIUM' : 'LOW';
    let status = forcedStatus;
    if (!status) {
      if (count >= 10) status = 'SUSPECTED_OUTBREAK';
      else if (count >= 6) status = 'UNDER_INVESTIGATION';
      else status = 'POTENTIAL';
    }

    const district = cases.find((c) => c.district)?.district || 'Maharashtra';
    const state = cases.find((c) => c.state)?.state || 'Maharashtra';
    const name = `${district} ${cases[0].disease} Cluster`;

    return {
      name,
      disease: cases[0].disease,
      centerLatitude: avgLat,
      centerLongitude: avgLng,
      radiusKm: Math.round(Math.max(maxDist, 1) * 10) / 10,
      firstReportAt: new Date(Math.min(...cases.map((c) => c.createdAt.getTime()))),
      lastReportAt: new Date(Math.max(...cases.map((c) => c.createdAt.getTime()))),
      reportCount: count,
      reportIds: cases.map((c) => c.id),
      status,
      severity,
      district,
      state,
    };
  }

  async detectClusters(): Promise<any[]> {
    // Only reports with vet-confirmed diagnoses are used for cluster analysis
    const recentReports = await prisma.healthReport.findMany({
      where: {
        status: { in: ['CONFIRMED', 'VET_REVIEWED'] },
        latitude: { not: null },
        longitude: { not: null },
      },
      include: {
        prediction: {
          include: {
            vetReviews: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const cases: GeoPoint[] = [];
    for (const r of recentReports) {
      if (!r.latitude || !r.longitude) continue;
      const latestReview = r.prediction?.vetReviews?.[0];
      const confirmedDisease = latestReview?.alternativeDiagnosis || r.prediction?.predictedDisease;
      
      // Exclude healthy animals and cases without confirmed diagnosis
      if (!confirmedDisease || confirmedDisease.trim().toLowerCase() === 'healthy') {
        continue;
      }

      cases.push({
        id: r.id,
        reportNumber: r.reportNumber || r.id,
        disease: confirmedDisease.trim(),
        lat: r.latitude,
        lng: r.longitude,
        district: r.district,
        state: r.state,
        createdAt: r.createdAt,
      });
    }

    // Group by disease, then run DBSCAN independently per disease so clusters stay disease-specific.
    const byDisease = new Map<string, GeoPoint[]>();
    for (const c of cases) {
      if (!byDisease.has(c.disease)) byDisease.set(c.disease, []);
      byDisease.get(c.disease)!.push(c);
    }

    const clusters: Cluster[] = [];
    for (const [disease, diseaseCases] of byDisease) {
      const found = this.dbscan(diseaseCases, CLUSTER_RADIUS_KM, MIN_CASES_FOR_CLUSTER);
      for (const clusterCases of found) {
        clusters.push(this.buildCluster(clusterCases));
      }
    }

    // Persist new clusters to DB if not already there, or update existing with latest stats.
    for (const cluster of clusters) {
      const existing = await prisma.diseaseCluster.findFirst({
        where: {
          disease: cluster.disease,
          centerLatitude: { gte: cluster.centerLatitude - 0.1, lte: cluster.centerLatitude + 0.1 },
          centerLongitude: { gte: cluster.centerLongitude - 0.1, lte: cluster.centerLongitude + 0.1 },
        },
      });

      if (!existing) {
        await prisma.diseaseCluster.create({
          data: {
            name: cluster.name,
            disease: cluster.disease,
            centerLatitude: cluster.centerLatitude,
            centerLongitude: cluster.centerLongitude,
            radiusKm: cluster.radiusKm,
            firstReportAt: cluster.firstReportAt,
            lastReportAt: cluster.lastReportAt,
            reportCount: cluster.reportCount,
            cattleAffected: cluster.reportCount,
            reportIds: cluster.reportIds,
            status: cluster.status as any,
          },
        });
      } else {
        // Keep existing status if modified by admin/vet (e.g. LAB_CONFIRMED), update counts
        await prisma.diseaseCluster.update({
          where: { id: existing.id },
          data: {
            name: cluster.name,
            reportCount: cluster.reportCount,
            cattleAffected: cluster.reportCount,
            radiusKm: cluster.radiusKm,
            lastReportAt: cluster.lastReportAt,
            reportIds: cluster.reportIds,
          },
        });
        cluster.status = existing.status;
      }
    }

    return clusters;
  }

  async getHighRiskAreas(): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reports = await prisma.healthReport.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ['AI_COMPLETED', 'VET_REVIEWED', 'CONFIRMED'] },
      },
      include: { prediction: true },
    });

    const byLocation: Record<string, any> = {};
    for (const report of reports) {
      const key = `${report.state}-${report.district}`;
      if (!byLocation[key]) byLocation[key] = { state: report.state, district: report.district, count: 0, diseases: new Set() };
      byLocation[key].count++;
      if (report.prediction?.predictedDisease) byLocation[key].diseases.add(report.prediction.predictedDisease);
    }

    return Object.values(byLocation)
      .filter((l: any) => l.count >= 3)
      .map((l: any) => ({ ...l, uniqueDiseases: l.diseases.size, diseaseList: Array.from(l.diseases) }))
      .sort((a: any, b: any) => b.count - a.count);
  }

  async generateAlerts(): Promise<any[]> {
    const clusters = await prisma.diseaseCluster.findMany({
      where: { status: 'POTENTIAL', reportCount: { gte: MIN_CASES_FOR_CLUSTER } },
    });
    const alerts: any[] = [];

    for (const cluster of clusters) {
      const severity = cluster.reportCount >= 10 ? 'CRITICAL' : cluster.reportCount >= 5 ? 'HIGH' : 'MEDIUM';
      const existingAlert = await prisma.outbreakAlert.findFirst({
        where: { disease: cluster.disease, isActive: true },
      });

      if (!existingAlert) {
        const alert = await prisma.outbreakAlert.create({
          data: {
            clusterId: cluster.id,
            disease: cluster.disease,
            severity,
            state: 'Multiple',
            district: 'Multiple',
            message: `Potential ${cluster.disease} outbreak detected with ${cluster.reportCount} cases in a ${cluster.radiusKm}km radius. First report: ${cluster.firstReportAt.toLocaleDateString()}.`,
            recommendations: [
              'Increase surveillance in the area',
              'Alert local veterinarians',
              'Review biosecurity measures',
              'Prepare response resources',
            ],
          },
        });
        alerts.push(alert);
      }
    }

    return alerts;
  }
}

export const outbreakDetectionService = new OutbreakDetectionService();
