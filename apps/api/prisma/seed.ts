import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vetpulse.com' },
    update: {},
    create: {
      email: 'admin@vetpulse.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
    },
  })
  console.log('Created admin user:', admin.email)

  // Create vet user
  const vetPassword = await bcrypt.hash('Vet@12345', 12)
  const vet = await prisma.user.upsert({
    where: { email: 'vet@vetpulse.com' },
    update: {},
    create: {
      email: 'vet@vetpulse.com',
      passwordHash: vetPassword,
      role: 'VETERINARIAN',
      isActive: true,
      emailVerified: true,
      vetProfile: {
        create: {
          firstName: 'Dr. John',
          lastName: 'Smith',
          phone: '+1234567890',
          specialization: 'Large Animal Medicine',
          licenseNumber: 'VET-LIC-001',
          yearsOfExperience: 15,
          rating: 4.8,
          isAvailable: true,
        },
      },
    },
  })
  console.log('Created vet user:', vet.email)

  // Create farmer user
  const farmerPassword = await bcrypt.hash('Farmer@123', 12)
  const farmer = await prisma.user.upsert({
    where: { email: 'farmer@vetpulse.com' },
    update: {},
    create: {
      email: 'farmer@vetpulse.com',
      passwordHash: farmerPassword,
      role: 'FARMER',
      isActive: true,
      emailVerified: true,
      farmerProfile: {
        create: {
          firstName: 'Robert',
          lastName: 'Johnson',
          phone: '+1234567891',
          state: 'Maharashtra',
          district: 'Pune',
          village: 'Village 1',
          farm: {
            create: {
              name: 'Johnson Cattle Farm',
              location: 'Rural Pune',
              latitude: 18.5204,
              longitude: 73.8567,
            },
          },
        },
      },
    },
  })
  console.log('Created farmer user:', farmer.email)

  // Get farmer's farm for creating cattle
  const farmerProfile = await prisma.farmerProfile.findFirst({
    where: { userId: farmer.id },
    include: { farm: true },
  })

  if (farmerProfile?.farm) {
    // Create sample cattle
    const cattle1 = await prisma.cattle.upsert({
      where: { farmId_tagNumber: { farmId: farmerProfile.farm.id, tagNumber: 'TAG-001' } },
      update: {},
      create: {
        farmId: farmerProfile.farm.id,
        ownerId: farmerProfile.id,
        tagNumber: 'TAG-001',
        name: 'Bessie',
        breed: 'Holstein',
        gender: 'FEMALE',
        dateOfBirth: new Date('2020-03-15'),
        estimatedAge: '4 years',
        weight: 550,
        pregnancyStatus: 'PREGNANT',
        isActive: true,
      },
    })
    console.log('Created cattle:', cattle1.tagNumber)

    const cattle2 = await prisma.cattle.upsert({
      where: { farmId_tagNumber: { farmId: farmerProfile.farm.id, tagNumber: 'TAG-002' } },
      update: {},
      create: {
        farmId: farmerProfile.farm.id,
        ownerId: farmerProfile.id,
        tagNumber: 'TAG-002',
        name: 'Daisy',
        breed: 'Jersey',
        gender: 'FEMALE',
        dateOfBirth: new Date('2019-06-20'),
        estimatedAge: '5 years',
        weight: 480,
        pregnancyStatus: 'NOT_PREGNANT',
        isActive: true,
      },
    })
    console.log('Created cattle:', cattle2.tagNumber)

    // Create a health report
    const report = await prisma.healthReport.create({
      data: {
        reportNumber: `RPT-${Date.now()}`,
        cattleId: cattle1.id,
        farmerId: farmerProfile.id,
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Village 1',
        latitude: 18.5204,
        longitude: 73.8567,
        temperature: 40.5,
        symptomDuration: '2 days',
        severity: 'moderate',
        consultationRequested: true,
        status: 'AI_COMPLETED',
        symptoms: {
          create: [
            { symptomName: 'Fever', symptomGroup: 'General' },
            { symptomName: 'Reduced appetite', symptomGroup: 'General' },
            { symptomName: 'Excessive salivation', symptomGroup: 'Mouth & Digestive' },
          ],
        },
        prediction: {
          create: {
            predictionId: `PRED-${Date.now()}`,
            provider: 'mock',
            modelStatus: 'MOCK',
            isSimulated: true,
            predictedDisease: 'Foot-and-Mouth Disease',
            confidence: 0.87,
            confidenceInterpretation: 'High',
            severity: 'high',
            supportingSymptoms: ['Fever', 'Reduced appetite', 'Excessive salivation'],
            recommendations: [
              'Arrange prompt veterinary examination',
              'Limit unnecessary animal movement',
              'Follow veterinarian guidance on isolation and biosecurity',
            ],
            disclaimer: 'This is a simulated AI prediction for demonstration purposes only.',
            status: 'COMPLETED',
          },
        },
      },
    })
    console.log('Created health report:', report.reportNumber)
  }

  // --- Deterministic geo-distributed health reports & clusters for DBSCAN & Disease Map ---
  // Clean up any previous demo reports and demo clusters to ensure 100% idempotent and reproducible seeds
  await prisma.outbreakAlert.deleteMany({
    where: { message: { contains: 'demo', mode: 'insensitive' } },
  });
  await prisma.diseaseCluster.deleteMany({});
  await prisma.healthReport.deleteMany({
    where: {
      OR: [
        { reportNumber: { startsWith: 'RPT-DEMO-' } },
        { reportNumber: { startsWith: 'RPT-MOCK-' } },
      ],
    },
  });

  if (farmerProfile?.farm) {
    const cattleList = await prisma.cattle.findMany({ where: { ownerId: farmerProfile.id } });
    const cattle = cattleList.length > 0 ? cattleList : [cattle1, cattle2];

    const mockReport = async (opts: {
      district: string;
      lat: number;
      lng: number;
      disease: string;
      index: number;
      totalCount: number;
      severity: 'mild' | 'moderate' | 'severe';
      temperature: number;
      confidence: number;
    }) => {
      const { district, index, totalCount, severity, temperature, confidence } = opts;
      const name = district.replace(/\s+/g, '');
      // Deterministic radial spread within 4-8 km of district center (well within 15 km DBSCAN eps)
      const angle = totalCount > 1 ? (index * 2 * Math.PI) / totalCount : 0;
      const radiusDeg = 0.004 + (index % 3) * 0.003; // ~0.4km to 1km radius offset
      const lat = Number((opts.lat + Math.sin(angle) * radiusDeg).toFixed(6));
      const lng = Number((opts.lng + Math.cos(angle) * radiusDeg).toFixed(6));
      const cattleForReport = cattle[index % cattle.length];

      return prisma.healthReport.create({
        data: {
          reportNumber: `RPT-DEMO-${name}-${index + 1}`,
          cattleId: cattleForReport.id,
          farmerId: farmerProfile.id,
          state: 'Maharashtra',
          district,
          village: `${district} Rural Sector ${index + 1}`,
          latitude: lat,
          longitude: lng,
          temperature,
          symptomDuration: `${(index % 5) + 1} days`,
          severity,
          consultationRequested: severity === 'severe',
          status: 'AI_COMPLETED',
          symptoms: {
            create: [
              { symptomName: 'Fever', symptomGroup: 'General' },
              { symptomName: 'Reduced appetite', symptomGroup: 'General' },
              { symptomName: 'Lethargy', symptomGroup: 'General' },
            ],
          },
          prediction: {
            create: {
              predictionId: `PRED-DEMO-${name}-${index + 1}`,
              provider: 'mock',
              modelStatus: 'MOCK',
              isSimulated: true,
              predictedDisease: opts.disease,
              confidence,
              confidenceInterpretation: confidence >= 0.8 ? 'High' : 'Moderate',
              severity,
              supportingSymptoms: ['Fever', 'Reduced appetite', 'Lethargy'],
              recommendations: [
                'Arrange prompt veterinary examination',
                'Isolate affected cattle from herd',
                'Monitor body temperature twice daily',
              ],
              disclaimer: 'This is a simulated AI prediction for demonstration purposes only.',
              status: 'COMPLETED',
            },
          },
        },
      });
    };

    // --- Diverse clusters spanning ALL severity and status types ---
    const clusterDefs: {
      district: string;
      lat: number;
      lng: number;
      disease: string;
      count: number;
      severity: 'mild' | 'moderate' | 'severe';
      status: 'SUSPECTED_OUTBREAK' | 'UNDER_INVESTIGATION' | 'POTENTIAL';
      riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'POTENTIAL';
      confidence: number;
    }[] = [
      // 1. CRITICAL Risk / SUSPECTED_OUTBREAK (Red) -> Pune: 12 cases
      {
        district: 'Pune',
        lat: 18.5204,
        lng: 73.8567,
        disease: 'Foot-and-Mouth Disease',
        count: 12,
        severity: 'severe',
        status: 'SUSPECTED_OUTBREAK',
        riskLevel: 'CRITICAL',
        confidence: 0.92,
      },
      // 2. CRITICAL Risk / SUSPECTED_OUTBREAK (Red) -> Nashik: 10 cases
      {
        district: 'Nashik',
        lat: 19.9975,
        lng: 73.7898,
        disease: 'Anthrax',
        count: 10,
        severity: 'severe',
        status: 'SUSPECTED_OUTBREAK',
        riskLevel: 'CRITICAL',
        confidence: 0.89,
      },
      // 3. HIGH Risk / UNDER_INVESTIGATION (Orange) -> Nagpur: 8 cases
      {
        district: 'Nagpur',
        lat: 21.1458,
        lng: 79.0882,
        disease: 'Lumpy Skin Disease',
        count: 8,
        severity: 'severe',
        status: 'UNDER_INVESTIGATION',
        riskLevel: 'HIGH',
        confidence: 0.86,
      },
      // 4. HIGH Risk / UNDER_INVESTIGATION (Orange) -> Aurangabad: 6 cases
      {
        district: 'Aurangabad',
        lat: 19.8762,
        lng: 75.8815,
        disease: 'Bovine Respiratory Disease',
        count: 6,
        severity: 'moderate',
        status: 'UNDER_INVESTIGATION',
        riskLevel: 'HIGH',
        confidence: 0.83,
      },
      // 5. CRITICAL Risk / SUSPECTED_OUTBREAK (Red) -> Ahmednagar: 5 cases
      {
        district: 'Ahmednagar',
        lat: 19.0952,
        lng: 74.7496,
        disease: 'Blackleg',
        count: 5,
        severity: 'severe',
        status: 'SUSPECTED_OUTBREAK',
        riskLevel: 'CRITICAL',
        confidence: 0.95,
      },
      // 6. MEDIUM Risk (Yellow) -> Kolhapur: 5 cases
      {
        district: 'Kolhapur',
        lat: 16.705,
        lng: 74.2433,
        disease: 'Mastitis',
        count: 5,
        severity: 'moderate',
        status: 'POTENTIAL',
        riskLevel: 'MEDIUM',
        confidence: 0.79,
      },
      // 7. MEDIUM Risk (Yellow) -> Satara: 4 cases
      {
        district: 'Satara',
        lat: 17.6805,
        lng: 74.0183,
        disease: 'Clostridial Diseases',
        count: 4,
        severity: 'moderate',
        status: 'POTENTIAL',
        riskLevel: 'MEDIUM',
        confidence: 0.76,
      },
      // 8. MEDIUM Risk (Yellow) -> Amravati: 4 cases
      {
        district: 'Amravati',
        lat: 20.9374,
        lng: 77.7799,
        disease: 'Brucellosis',
        count: 4,
        severity: 'moderate',
        status: 'POTENTIAL',
        riskLevel: 'MEDIUM',
        confidence: 0.74,
      },
      // 9. LOW Risk (Green) -> Solapur: 3 cases
      {
        district: 'Solapur',
        lat: 17.6599,
        lng: 75.9064,
        disease: 'Theileriosis',
        count: 3,
        severity: 'mild',
        status: 'POTENTIAL',
        riskLevel: 'LOW',
        confidence: 0.71,
      },
      // 10. LOW Risk (Green) -> Wardha: 3 cases
      {
        district: 'Wardha',
        lat: 20.7453,
        lng: 78.6022,
        disease: 'Bovine Tuberculosis',
        count: 3,
        severity: 'mild',
        status: 'POTENTIAL',
        riskLevel: 'LOW',
        confidence: 0.69,
      },
      // 11. POTENTIAL Surveillance (Blue) -> Jalgaon: 3 cases
      {
        district: 'Jalgaon',
        lat: 21.0077,
        lng: 75.5626,
        disease: 'Salmonellosis',
        count: 3,
        severity: 'mild',
        status: 'POTENTIAL',
        riskLevel: 'POTENTIAL',
        confidence: 0.67,
      },
    ];

    // Create the reports and pre-seed the DiseaseCluster records
    for (const c of clusterDefs) {
      const createdReports: any[] = [];
      for (let i = 0; i < c.count; i++) {
        const rep = await mockReport({
          district: c.district,
          lat: c.lat,
          lng: c.lng,
          disease: c.disease,
          index: i,
          totalCount: c.count,
          severity: c.severity,
          temperature: 39 + (i % 4) * 0.4,
          confidence: c.confidence,
        });
        createdReports.push(rep);
      }

      // Pre-seed DiseaseCluster record
      const cluster = await prisma.diseaseCluster.create({
        data: {
          name: `${c.district} ${c.disease} Cluster`,
          disease: c.disease,
          status: c.status,
          centerLatitude: c.lat,
          centerLongitude: c.lng,
          radiusKm: 8.5,
          firstReportAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          lastReportAt: new Date(),
          reportCount: c.count,
          cattleAffected: c.count,
          reportIds: createdReports.map((r) => r.id),
          notes: `Deterministic demo cluster for ${c.district}. Risk level: ${c.riskLevel}, Status: ${c.status}.`,
        },
      });

      // Create matching outbreak alert for critical and high clusters
      if (c.status === 'SUSPECTED_OUTBREAK' || c.status === 'UNDER_INVESTIGATION') {
        await prisma.outbreakAlert.create({
          data: {
            clusterId: cluster.id,
            disease: c.disease,
            severity: c.riskLevel === 'CRITICAL' ? 'CRITICAL' : c.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
            state: 'Maharashtra',
            district: c.district,
            message: `Demo Alert: ${c.status.replace(/_/g, ' ')} for ${c.disease} in ${c.district} (${c.count} cases verified).`,
            recommendations: [
              'Deploy veterinary rapid-response team',
              'Quarantine livestock within 10km buffer',
              'Initiate ring vaccination protocol',
            ],
          },
        });
      }
    }

    // --- Scattered "noise" reports: far apart across districts (DBSCAN properly treats these as noise) ---
    const noisePoints = [
      { district: 'Osmanabad', lat: 18.165, lng: 76.04, disease: 'Foot-and-Mouth Disease' },
      { district: 'Beed', lat: 18.9892, lng: 75.7532, disease: 'Lumpy Skin Disease' },
      { district: 'Latur', lat: 18.3995, lng: 76.5608, disease: 'Anthrax' },
      { district: 'Parbhani', lat: 19.2686, lng: 76.7707, disease: 'Mastitis' },
      { district: 'Nanded', lat: 19.1383, lng: 77.321, disease: 'Brucellosis' },
      { district: 'Ratnagiri', lat: 16.9902, lng: 73.312, disease: 'Theileriosis' },
    ];

    for (let i = 0; i < noisePoints.length; i++) {
      const n = noisePoints[i];
      await mockReport({
        district: n.district,
        lat: n.lat,
        lng: n.lng,
        disease: n.disease,
        index: 50 + i,
        totalCount: 1,
        severity: 'mild',
        temperature: 38.8,
        confidence: 0.62,
      });
    }

    const totalClusterReports = clusterDefs.reduce((s, c) => s + c.count, 0);
    console.log(
      `Deterministic demo dataset seeded: ${clusterDefs.length} clusters (${totalClusterReports} reports) + ${noisePoints.length} isolated noise reports across Maharashtra.`
    );
  }

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
