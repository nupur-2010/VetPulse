-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FARMER', 'VETERINARIAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "PregnancyStatus" AS ENUM ('NOT_PREGNANT', 'PREGNANT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'AI_COMPLETED', 'VET_REVIEWED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "PredictionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('AGREES_AI', 'DISAGREES_AI', 'INCONCLUSIVE', 'ALTERNATIVE_DISEASE', 'NEEDS_EXAMINATION');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ClusterStatus" AS ENUM ('POTENTIAL', 'UNDER_INVESTIGATION', 'SUSPECTED_OUTBREAK', 'LAB_CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "village" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cattle" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "tagNumber" TEXT NOT NULL,
    "name" TEXT,
    "breed" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "estimatedAge" TEXT,
    "weight" DOUBLE PRECISION,
    "identificationMarks" TEXT,
    "pregnancyStatus" "PregnancyStatus" NOT NULL DEFAULT 'UNKNOWN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cattle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CattlePhoto" (
    "id" TEXT NOT NULL,
    "cattleId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CattlePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CattleVaccination" (
    "id" TEXT NOT NULL,
    "cattleId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "dateGiven" TIMESTAMP(3) NOT NULL,
    "nextDueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CattleVaccination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthReport" (
    "id" TEXT NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "cattleId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "village" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "location" TEXT,
    "temperature" DOUBLE PRECISION,
    "symptomDuration" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'mild',
    "milkProductionChange" TEXT,
    "waterIntakeChange" TEXT,
    "recentVaccination" TEXT,
    "recentIllness" TEXT,
    "recentTreatment" TEXT,
    "additionalNotes" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "consultationRequested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthReportSymptom" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "symptomName" TEXT NOT NULL,
    "symptomGroup" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthReportSymptom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthReportPhoto" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthReportPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "modelStatus" TEXT NOT NULL DEFAULT 'MOCK',
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "predictedDisease" TEXT,
    "confidence" DOUBLE PRECISION,
    "confidenceInterpretation" TEXT,
    "severity" TEXT,
    "supportingSymptoms" TEXT[],
    "recommendations" TEXT[],
    "imageAssessmentStatus" TEXT NOT NULL DEFAULT 'not_analyzed',
    "imageAssessmentNote" TEXT,
    "disclaimer" TEXT NOT NULL,
    "predictionTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PredictionStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionCandidate" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "disease" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VetProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "specialization" TEXT,
    "licenseNumber" TEXT,
    "licenseState" TEXT,
    "yearsOfExperience" INTEGER,
    "clinicName" TEXT,
    "clinicAddress" TEXT,
    "consultationFee" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VetProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VetAvailability" (
    "id" TEXT NOT NULL,
    "vetId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VetAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionReview" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "vetId" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "notes" TEXT,
    "alternativeDiagnosis" TEXT,
    "recommendedActions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "vetId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'REQUESTED',
    "scheduledAt" TIMESTAMP(3),
    "duration" INTEGER,
    "reason" TEXT,
    "findings" TEXT,
    "diagnosis" TEXT,
    "treatmentPlan" TEXT,
    "medications" TEXT,
    "followUpDate" TIMESTAMP(3),
    "farmerRating" INTEGER,
    "farmerFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiseaseCluster" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "disease" TEXT NOT NULL,
    "status" "ClusterStatus" NOT NULL DEFAULT 'POTENTIAL',
    "centerLatitude" DOUBLE PRECISION NOT NULL,
    "centerLongitude" DOUBLE PRECISION NOT NULL,
    "radiusKm" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "firstReportAt" TIMESTAMP(3) NOT NULL,
    "lastReportAt" TIMESTAMP(3) NOT NULL,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "cattleAffected" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "investigatedBy" TEXT,
    "investigatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reportIds" TEXT[],

    CONSTRAINT "DiseaseCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutbreakAlert" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT,
    "disease" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recommendations" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutbreakAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReportStats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "totalReports" INTEGER NOT NULL DEFAULT 0,
    "aiProcessed" INTEGER NOT NULL DEFAULT 0,
    "vetReviewed" INTEGER NOT NULL DEFAULT 0,
    "confirmedCases" INTEGER NOT NULL DEFAULT 0,
    "diseaseBreakdown" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReportStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerProfile_userId_key" ON "FarmerProfile"("userId");

-- CreateIndex
CREATE INDEX "FarmerProfile_userId_idx" ON "FarmerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Farm_farmerId_key" ON "Farm"("farmerId");

-- CreateIndex
CREATE INDEX "Cattle_ownerId_idx" ON "Cattle"("ownerId");

-- CreateIndex
CREATE INDEX "Cattle_tagNumber_idx" ON "Cattle"("tagNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Cattle_farmId_tagNumber_key" ON "Cattle"("farmId", "tagNumber");

-- CreateIndex
CREATE UNIQUE INDEX "HealthReport_reportNumber_key" ON "HealthReport"("reportNumber");

-- CreateIndex
CREATE INDEX "HealthReport_cattleId_idx" ON "HealthReport"("cattleId");

-- CreateIndex
CREATE INDEX "HealthReport_farmerId_idx" ON "HealthReport"("farmerId");

-- CreateIndex
CREATE INDEX "HealthReport_status_idx" ON "HealthReport"("status");

-- CreateIndex
CREATE INDEX "HealthReport_createdAt_idx" ON "HealthReport"("createdAt");

-- CreateIndex
CREATE INDEX "HealthReport_district_createdAt_idx" ON "HealthReport"("district", "createdAt");

-- CreateIndex
CREATE INDEX "HealthReportSymptom_reportId_idx" ON "HealthReportSymptom"("reportId");

-- CreateIndex
CREATE INDEX "HealthReportPhoto_reportId_idx" ON "HealthReportPhoto"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_reportId_key" ON "Prediction"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_predictionId_key" ON "Prediction"("predictionId");

-- CreateIndex
CREATE INDEX "Prediction_reportId_idx" ON "Prediction"("reportId");

-- CreateIndex
CREATE INDEX "Prediction_predictedDisease_idx" ON "Prediction"("predictedDisease");

-- CreateIndex
CREATE INDEX "Prediction_status_idx" ON "Prediction"("status");

-- CreateIndex
CREATE INDEX "PredictionCandidate_predictionId_idx" ON "PredictionCandidate"("predictionId");

-- CreateIndex
CREATE UNIQUE INDEX "VetProfile_userId_key" ON "VetProfile"("userId");

-- CreateIndex
CREATE INDEX "VetProfile_userId_idx" ON "VetProfile"("userId");

-- CreateIndex
CREATE INDEX "VetAvailability_vetId_idx" ON "VetAvailability"("vetId");

-- CreateIndex
CREATE INDEX "PredictionReview_predictionId_idx" ON "PredictionReview"("predictionId");

-- CreateIndex
CREATE INDEX "PredictionReview_vetId_idx" ON "PredictionReview"("vetId");

-- CreateIndex
CREATE INDEX "Consultation_reportId_idx" ON "Consultation"("reportId");

-- CreateIndex
CREATE INDEX "Consultation_vetId_idx" ON "Consultation"("vetId");

-- CreateIndex
CREATE INDEX "Consultation_farmerId_idx" ON "Consultation"("farmerId");

-- CreateIndex
CREATE INDEX "Consultation_status_idx" ON "Consultation"("status");

-- CreateIndex
CREATE INDEX "DiseaseCluster_disease_idx" ON "DiseaseCluster"("disease");

-- CreateIndex
CREATE INDEX "DiseaseCluster_status_idx" ON "DiseaseCluster"("status");

-- CreateIndex
CREATE INDEX "DiseaseCluster_centerLatitude_centerLongitude_idx" ON "DiseaseCluster"("centerLatitude", "centerLongitude");

-- CreateIndex
CREATE INDEX "OutbreakAlert_disease_idx" ON "OutbreakAlert"("disease");

-- CreateIndex
CREATE INDEX "OutbreakAlert_state_district_idx" ON "OutbreakAlert"("state", "district");

-- CreateIndex
CREATE INDEX "OutbreakAlert_isActive_idx" ON "OutbreakAlert"("isActive");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "DailyReportStats_date_idx" ON "DailyReportStats"("date");

-- CreateIndex
CREATE INDEX "DailyReportStats_state_district_idx" ON "DailyReportStats"("state", "district");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReportStats_date_state_district_key" ON "DailyReportStats"("date", "state", "district");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerProfile" ADD CONSTRAINT "FarmerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "FarmerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cattle" ADD CONSTRAINT "Cattle_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cattle" ADD CONSTRAINT "Cattle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "FarmerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattlePhoto" ADD CONSTRAINT "CattlePhoto_cattleId_fkey" FOREIGN KEY ("cattleId") REFERENCES "Cattle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattleVaccination" ADD CONSTRAINT "CattleVaccination_cattleId_fkey" FOREIGN KEY ("cattleId") REFERENCES "Cattle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthReport" ADD CONSTRAINT "HealthReport_cattleId_fkey" FOREIGN KEY ("cattleId") REFERENCES "Cattle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthReport" ADD CONSTRAINT "HealthReport_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "FarmerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthReportSymptom" ADD CONSTRAINT "HealthReportSymptom_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "HealthReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthReportPhoto" ADD CONSTRAINT "HealthReportPhoto_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "HealthReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "HealthReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionCandidate" ADD CONSTRAINT "PredictionCandidate_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VetProfile" ADD CONSTRAINT "VetProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VetAvailability" ADD CONSTRAINT "VetAvailability_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "VetProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionReview" ADD CONSTRAINT "PredictionReview_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionReview" ADD CONSTRAINT "PredictionReview_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "VetProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "HealthReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "VetProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "FarmerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutbreakAlert" ADD CONSTRAINT "OutbreakAlert_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "DiseaseCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
