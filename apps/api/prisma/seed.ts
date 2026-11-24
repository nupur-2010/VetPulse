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
    // Create 6 realistic cattle for Robert Johnson's farm
    const farmerCattleDefs = [
      { tagNumber: 'TAG-001', name: 'Bessie', breed: 'Holstein Friesian', gender: 'FEMALE' as const, weight: 550, age: '4 years', pregnancyStatus: 'PREGNANT' as const },
      { tagNumber: 'TAG-002', name: 'Daisy', breed: 'Jersey', gender: 'FEMALE' as const, weight: 480, age: '5 years', pregnancyStatus: 'NOT_PREGNANT' as const },
      { tagNumber: 'TAG-003', name: 'Bella', breed: 'Gir', gender: 'FEMALE' as const, weight: 420, age: '3 years', pregnancyStatus: 'NOT_PREGNANT' as const },
      { tagNumber: 'TAG-004', name: 'Luna', breed: 'Sahiwal', gender: 'FEMALE' as const, weight: 460, age: '4 years', pregnancyStatus: 'PREGNANT' as const },
      { tagNumber: 'TAG-005', name: 'Molly', breed: 'Murrah Buffalo', gender: 'FEMALE' as const, weight: 620, age: '6 years', pregnancyStatus: 'NOT_PREGNANT' as const },
      { tagNumber: 'TAG-006', name: 'Max', breed: 'Red Sindhi', gender: 'MALE' as const, weight: 510, age: '2 years', pregnancyStatus: 'NOT_PREGNANT' as const },
    ];

    const farmerCattle: any[] = [];
    for (const c of farmerCattleDefs) {
      const cow = await prisma.cattle.upsert({
        where: { farmId_tagNumber: { farmId: farmerProfile.farm.id, tagNumber: c.tagNumber } },
        update: {},
        create: {
          farmId: farmerProfile.farm.id,
          ownerId: farmerProfile.id,
          tagNumber: c.tagNumber,
          name: c.name,
          breed: c.breed,
          gender: c.gender,
          weight: c.weight,
          estimatedAge: c.age,
          pregnancyStatus: c.pregnancyStatus,
          isActive: true,
        },
      });
      farmerCattle.push(cow);
    }
    console.log(`Created ${farmerCattle.length} cattle for farmer:`, farmer.email);

    // Clean up previous personal demo reports for Robert Johnson
    await prisma.healthReport.deleteMany({
      where: { reportNumber: { startsWith: 'RPT-RJ-' } },
    });

    // Create 4 realistic health assessments for Robert Johnson's cattle
    const rjReports = [
      { cattle: farmerCattle[0], disease: 'Foot-and-Mouth Disease', temp: 40.5, severity: 'severe', symptoms: ['Fever', 'Blisters on hooves', 'Excessive salivation'] },
      { cattle: farmerCattle[1], disease: 'Mastitis', temp: 39.8, severity: 'moderate', symptoms: ['Swollen udder', 'Abnormal milk', 'Fever'] },
      { cattle: farmerCattle[2], disease: 'General Fever', temp: 39.1, severity: 'mild', symptoms: ['Mild fever', 'Reduced appetite'] },
      { cattle: farmerCattle[3], disease: 'Lumpy Skin Disease', temp: 40.2, severity: 'moderate', symptoms: ['Skin nodules', 'Fever', 'Lethargy'] },
    ];

    for (let i = 0; i < rjReports.length; i++) {
      const r = rjReports[i];
      await prisma.healthReport.create({
        data: {
          reportNumber: `RPT-RJ-${i + 1}`,
          cattleId: r.cattle.id,
          farmerId: farmerProfile.id,
          state: 'Maharashtra',
          district: 'Pune',
          village: 'Village 1',
          latitude: 18.5204 + (i * 0.002),
          longitude: 73.8567 + (i * 0.002),
          temperature: r.temp,
          symptomDuration: `${i + 2} days`,
          severity: r.severity,
          consultationRequested: r.severity === 'severe',
          status: 'AI_COMPLETED',
          symptoms: {
            create: r.symptoms.map(s => ({ symptomName: s, symptomGroup: 'Clinical' })),
          },
          prediction: {
            create: {
              predictionId: `PRED-RJ-${i + 1}`,
              provider: 'mock',
              modelStatus: 'MOCK',
              isSimulated: true,
              predictedDisease: r.disease,
              confidence: 0.88,
              confidenceInterpretation: 'High',
              severity: r.severity,
              supportingSymptoms: r.symptoms,
              recommendations: [
                'Arrange prompt veterinary examination',
                'Isolate affected cattle from herd',
                'Follow veterinarian guidance',
              ],
              disclaimer: 'This is a simulated AI prediction for demonstration purposes only.',
              status: 'COMPLETED',
            },
          },
        },
      });
    }
    console.log(`Created 4 health reports for Robert Johnson.`);
  }

  // Create surveillance hub user and farm for state-wide monitoring data
  const surveillanceUser = await prisma.user.upsert({
    where: { email: 'surveillance@vetpulse.com' },
    update: {},
    create: {
      email: 'surveillance@vetpulse.com',
      passwordHash: farmerPassword,
      role: 'FARMER',
      isActive: true,
      emailVerified: true,
      farmerProfile: {
        create: {
          firstName: 'State',
          lastName: 'Surveillance Hub',
          phone: '+919800000000',
          state: 'Maharashtra',
          district: 'Statewide',
          village: 'Sentinel Hub',
          farm: {
            create: {
              name: 'Maharashtra Animal Health Network',
              location: 'Statewide Sentinel Network',
              latitude: 19.7515,
              longitude: 75.7139,
            },
          },
        },
      },
    },
    include: { farmerProfile: { include: { farm: true } } },
  });

  const survProfile = surveillanceUser.farmerProfile!;
  const survFarm = survProfile.farm!;

  // Create a pool of surveillance cattle
  const survCattle: any[] = [];
  for (let i = 1; i <= 10; i++) {
    const cow = await prisma.cattle.upsert({
      where: { farmId_tagNumber: { farmId: survFarm.id, tagNumber: `SURV-TAG-${String(i).padStart(3, '0')}` } },
      update: {},
      create: {
        farmId: survFarm.id,
        ownerId: survProfile.id,
        tagNumber: `SURV-TAG-${String(i).padStart(3, '0')}`,
        name: `Sentinel Herd ${i}`,
        breed: i % 2 === 0 ? 'Holstein' : 'Indigenous Cross',
        gender: 'FEMALE',
        weight: 450 + i * 15,
        estimatedAge: '4 years',
        pregnancyStatus: 'NOT_PREGNANT',
        isActive: true,
      },
    });
    survCattle.push(cow);
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

  if (survProfile && survFarm) {
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
      // Deterministic radial spread within ~0.3 - 0.9 km (well within the 5 km DBSCAN eps)
      const angle = totalCount > 1 ? (index * 2 * Math.PI) / totalCount : 0;
      const radiusDeg = 0.003 + (index % 4) * 0.002;
      const lat = Number((opts.lat + Math.sin(angle) * radiusDeg).toFixed(6));
      const lng = Number((opts.lng + Math.cos(angle) * radiusDeg).toFixed(6));
      const cattleForReport = survCattle[index % survCattle.length];

      return prisma.healthReport.create({
        data: {
          reportNumber: `RPT-DEMO-${name}-${index + 1}`,
          cattleId: cattleForReport.id,
          farmerId: survProfile.id,
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

    // --- Diverse clusters spanning ALL severity and status types (26 clusters across Maharashtra) ---
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
      // === CRITICAL Risk (≥10 cases, Red) ===
      {
        district: 'Pune',
        lat: 18.5204,
        lng: 73.8567,
        disease: 'Foot-and-Mouth Disease',
        count: 14,
        severity: 'severe',
        status: 'SUSPECTED_OUTBREAK',
        riskLevel: 'CRITICAL',
        confidence: 0.94,
      },
      {
        district: 'Nashik',
        lat: 19.9975,
        lng: 73.7898,
        disease: 'Anthrax',
        count: 12,
        severity: 'severe',
        status: 'SUSPECTED_OUTBREAK',
        riskLevel: 'CRITICAL',
        confidence: 0.91,
      },
      {
        district: 'Ahmednagar',
        lat: 19.0952,
        lng: 74.7496,
        disease: 'Blackleg',
        count: 11,
        severity: 'severe',
        status: 'SUSPECTED_OUTBREAK',
        riskLevel: 'CRITICAL',
        confidence: 0.95,
      },
      {
        district: 'Jalna',
        lat: 19.8347,
        lng: 75.8816,
        disease: 'Haemorrhagic Septicaemia',
        count: 10,
        severity: 'severe',
        status: 'SUSPECTED_OUTBREAK',
        riskLevel: 'CRITICAL',
        confidence: 0.89,
      },

      // === HIGH Risk (6–9 cases, Orange) ===
      {
        district: 'Nagpur',
        lat: 21.1458,
        lng: 79.0882,
        disease: 'Lumpy Skin Disease',
        count: 9,
        severity: 'severe',
        status: 'UNDER_INVESTIGATION',
        riskLevel: 'HIGH',
        confidence: 0.88,
      },
      {
        district: 'Aurangabad',
        lat: 19.8762,
        lng: 75.3433,
        disease: 'Bovine Respiratory Disease',
        count: 8,
        severity: 'moderate',
        status: 'UNDER_INVESTIGATION',
        riskLevel: 'HIGH',
        confidence: 0.84,
      },
      {
        district: 'Dhule',
        lat: 20.9042,
        lng: 74.7749,
        disease: 'Foot-and-Mouth Disease',
        count: 7,
        severity: 'severe',
        status: 'UNDER_INVESTIGATION',
        riskLevel: 'HIGH',
        confidence: 0.86,
      },
      {
        district: 'Solapur',
        lat: 17.6599,
        lng: 75.9064,
        disease: 'Anthrax',
        count: 6,
        severity: 'moderate',
        status: 'UNDER_INVESTIGATION',
        riskLevel: 'HIGH',
        confidence: 0.82,
      },
      {
        district: 'Nanded',
        lat: 19.1383,
        lng: 77.321,
        disease: 'Blackleg',
        count: 8,
        severity: 'severe',
        status: 'UNDER_INVESTIGATION',
        riskLevel: 'HIGH',
        confidence: 0.87,
      },
      {
        district: 'Chandrapur',
        lat: 19.9615,
        lng: 79.2961,
        disease: 'Bovine Respiratory Disease',
        count: 7,
        severity: 'moderate',
        status: 'UNDER_INVESTIGATION',
        riskLevel: 'HIGH',
        confidence: 0.81,
      },

      // === MEDIUM Risk (4–5 cases, Yellow) ===
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
      {
        district: 'Satara',
        lat: 17.6805,
        lng: 74.0183,
        disease: 'Clostridial Diseases',
        count: 5,
        severity: 'moderate',
        status: 'POTENTIAL',
        riskLevel: 'MEDIUM',
        confidence: 0.77,
      },
      {
        district: 'Amravati',
        lat: 20.9374,
        lng: 77.7799,
        disease: 'Brucellosis',
        count: 4,
        severity: 'moderate',
        status: 'POTENTIAL',
        riskLevel: 'MEDIUM',
        confidence: 0.75,
      },
      {
        district: 'Sangli',
        lat: 16.8524,
        lng: 74.5815,
        disease: 'Theileriosis',
        count: 5,
        severity: 'moderate',
        status: 'POTENTIAL',
        riskLevel: 'MEDIUM',
        confidence: 0.78,
      },
      {
        district: 'Latur',
        lat: 18.4088,
        lng: 76.5604,
        disease: 'Mastitis',
        count: 4,
        severity: 'moderate',
        status: 'POTENTIAL',
        riskLevel: 'MEDIUM',
        confidence: 0.73,
      },
      {
        district: 'Akola',
        lat: 20.7002,
        lng: 77.0082,
        disease: 'Brucellosis',
        count: 4,
        severity: 'moderate',
        status: 'POTENTIAL',
        riskLevel: 'MEDIUM',
        confidence: 0.76,
      },
      {
        district: 'Buldhana',
        lat: 20.5293,
        lng: 76.1843,
        disease: 'Clostridial Diseases',
        count: 5,
        severity: 'moderate',
        status: 'POTENTIAL',
        riskLevel: 'MEDIUM',
        confidence: 0.74,
      },
      {
        district: 'Beed',
        lat: 18.9892,
        lng: 75.7532,
        disease: 'Theileriosis',
        count: 4,
        severity: 'moderate',
        status: 'POTENTIAL',
        riskLevel: 'MEDIUM',
        confidence: 0.72,
      },

      // === LOW Risk (3 cases, Green) ===
      {
        district: 'Wardha',
        lat: 20.7453,
        lng: 78.6022,
        disease: 'Haemorrhagic Septicaemia',
        count: 3,
        severity: 'mild',
        status: 'POTENTIAL',
        riskLevel: 'LOW',
        confidence: 0.71,
      },
      {
        district: 'Osmanabad',
        lat: 18.1856,
        lng: 76.0423,
        disease: 'Foot-and-Mouth Disease',
        count: 3,
        severity: 'mild',
        status: 'POTENTIAL',
        riskLevel: 'LOW',
        confidence: 0.69,
      },
      {
        district: 'Parbhani',
        lat: 19.2686,
        lng: 76.7707,
        disease: 'Lumpy Skin Disease',
        count: 3,
        severity: 'mild',
        status: 'POTENTIAL',
        riskLevel: 'LOW',
        confidence: 0.68,
      },
      {
        district: 'Bhandara',
        lat: 21.1713,
        lng: 79.6548,
        disease: 'Blackleg',
        count: 3,
        severity: 'mild',
        status: 'POTENTIAL',
        riskLevel: 'LOW',
        confidence: 0.70,
      },
      {
        district: 'Gondia',
        lat: 21.4598,
        lng: 80.1961,
        disease: 'Anthrax',
        count: 3,
        severity: 'mild',
        status: 'POTENTIAL',
        riskLevel: 'LOW',
        confidence: 0.67,
      },
      {
        district: 'Raigad',
        lat: 18.5158,
        lng: 73.1822,
        disease: 'Mastitis',
        count: 3,
        severity: 'mild',
        status: 'POTENTIAL',
        riskLevel: 'LOW',
        confidence: 0.66,
      },
      {
        district: 'Ratnagiri',
        lat: 16.9902,
        lng: 73.312,
        disease: 'Bovine Respiratory Disease',
        count: 3,
        severity: 'mild',
        status: 'POTENTIAL',
        riskLevel: 'LOW',
        confidence: 0.65,
      },
      {
        district: 'Sindhudurg',
        lat: 16.1158,
        lng: 73.6934,
        disease: 'Theileriosis',
        count: 3,
        severity: 'mild',
        status: 'POTENTIAL',
        riskLevel: 'LOW',
        confidence: 0.64,
      },

      // === POTENTIAL / Active Surveillance (Blue) ===
      {
        district: 'Jalgaon',
        lat: 21.0077,
        lng: 75.5626,
        disease: 'Rabies',
        count: 2,
        severity: 'mild',
        status: 'POTENTIAL',
        riskLevel: 'POTENTIAL',
        confidence: 0.65,
      },
      {
        district: 'Yavatmal',
        lat: 20.3888,
        lng: 78.1204,
        disease: 'Babesiosis',
        count: 2,
        severity: 'mild',
        status: 'POTENTIAL',
        riskLevel: 'POTENTIAL',
        confidence: 0.63,
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
          radiusKm: 4.5,
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
              'Quarantine livestock within 5km containment buffer',
              'Initiate ring vaccination protocol',
            ],
          },
        });
      }
    }

    // --- Scattered "noise" reports: far apart across districts (DBSCAN properly treats these as noise) ---
    const noisePoints = [
      { district: 'Thane', lat: 19.2183, lng: 72.9781, disease: 'Foot-and-Mouth Disease' },
      { district: 'Palghar', lat: 19.6967, lng: 72.7699, disease: 'Lumpy Skin Disease' },
      { district: 'Nandurbar', lat: 21.3705, lng: 74.2405, disease: 'Anthrax' },
      { district: 'Hingoli', lat: 19.7196, lng: 77.1478, disease: 'Mastitis' },
      { district: 'Washim', lat: 20.1112, lng: 77.1352, disease: 'Brucellosis' },
      { district: 'Gadchiroli', lat: 20.1849, lng: 80.003, disease: 'Theileriosis' },
      { district: 'Kolhapur Rural', lat: 16.505, lng: 74.1433, disease: 'Rabies' },
      { district: 'Pune Outer', lat: 18.2204, lng: 74.1567, disease: 'Blackleg' },
    ];

    for (let i = 0; i < noisePoints.length; i++) {
      const n = noisePoints[i];
      await mockReport({
        district: n.district,
        lat: n.lat,
        lng: n.lng,
        disease: n.disease,
        index: 100 + i,
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
