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
