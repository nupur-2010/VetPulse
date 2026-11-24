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

  // --- Mock geo-distributed health reports so DBSCAN clusters are visible on the map ---
  const existingReportCount = await prisma.healthReport.count()
  if (existingReportCount < 25 && farmerProfile?.farm) {
    const cattle = await prisma.cattle.findMany({ where: { ownerId: farmerProfile.id }, take: 2 })
    // Each cluster: a district center with N nearby reports of the same disease (within DBSCAN eps)
    const clusterDefs = [
      { district: 'Pune', lat: 18.5204, lng: 73.8567, disease: 'Foot-and-Mouth Disease', count: 5, jitter: 0.02, confidence: 0.88 },
      { district: 'Nagpur', lat: 21.1458, lng: 79.0882, disease: 'Lumpy Skin Disease', count: 4, jitter: 0.018, confidence: 0.84 },
      { district: 'Aurangabad', lat: 19.8762, lng: 75.8815, disease: 'Bovine Respiratory Disease', count: 4, jitter: 0.02, confidence: 0.81 },
      { district: 'Kolhapur', lat: 16.705, lng: 74.2433, disease: 'Mastitis', count: 3, jitter: 0.015, confidence: 0.79 },
      { district: 'Nashik', lat: 19.9975, lng: 73.7898, disease: 'Anthrax', count: 3, jitter: 0.014, confidence: 0.74 },
      { district: 'Satara', lat: 17.6805, lng: 74.0183, disease: 'Clostridial Diseases', count: 3, jitter: 0.013, confidence: 0.72 },
      { district: 'Solapur', lat: 17.6599, lng: 75.9064, disease: 'Theileriosis', count: 3, jitter: 0.014, confidence: 0.77 },
    ]

    for (const def of clusterDefs) {
      for (let i = 0; i < def.count; i++) {
        const lat = def.lat + (Math.random() - 0.5) * 2 * def.jitter
        const lng = def.lng + (Math.random() - 0.5) * 2 * def.jitter
        const cattleForReport = cattle[i % cattle.length]
        await prisma.healthReport.create({
          data: {
            reportNumber: `RPT-MOCK-${def.district}-${i + 1}`,
            cattleId: cattleForReport.id,
            farmerId: farmerProfile.id,
            state: 'Maharashtra',
            district: def.district,
            village: `${def.district} Village ${i + 1}`,
            latitude: lat,
            longitude: lng,
            temperature: 39 + Math.round(Math.random() * 20) / 10,
            symptomDuration: `${Math.round(Math.random() * 3) + 1} days`,
            severity: ['mild', 'moderate', 'severe'][Math.floor(Math.random() * 3)] as any,
            consultationRequested: false,
            status: 'AI_COMPLETED',
            symptoms: {
              create: [
                { symptomName: 'Fever', symptomGroup: 'General' },
                { symptomName: 'Reduced appetite', symptomGroup: 'General' },
              ],
            },
            prediction: {
              create: {
                predictionId: `PRED-MOCK-${def.district}-${i + 1}`,
                provider: 'mock',
                modelStatus: 'MOCK',
                isSimulated: true,
                predictedDisease: def.disease,
                confidence: def.confidence + (Math.random() - 0.5) * 0.06,
                confidenceInterpretation: 'High',
                severity: 'high',
                supportingSymptoms: ['Fever', 'Reduced appetite'],
                recommendations: ['Arrange veterinary examination', 'Isolate affected animal'],
                disclaimer: 'This is a simulated AI prediction for demonstration purposes only.',
                status: 'COMPLETED',
              },
            },
          },
        })
      }
    }
    console.log('Created geo-distributed mock reports for DBSCAN cluster visualization')
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
