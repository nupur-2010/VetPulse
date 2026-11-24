// User & Auth
export type UserRole = 'FARMER' | 'VETERINARIAN' | 'ADMIN'

export interface User {
  id: string
  email: string
  role: UserRole
  isActive: boolean
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface FarmerProfile {
  id: string
  userId: string
  firstName: string
  lastName: string
  phone?: string
  address?: string
  state: string
  district: string
  village?: string
  createdAt: string
  updatedAt: string
}

export interface VetProfile {
  id: string
  userId: string
  firstName: string
  lastName: string
  phone?: string
  specialization?: string
  licenseNumber?: string
  yearsOfExperience?: number
  rating?: number
  totalReviews?: number
  isAvailable: boolean
  consultationFee?: number
}

export interface AuthResponse {
  user: User
  farmerProfile?: FarmerProfile
  vetProfile?: VetProfile
  accessToken: string
  refreshToken: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  confirmPassword: string
  role: 'FARMER' | 'VETERINARIAN'
  firstName: string
  lastName: string
  phone?: string
  state: string
  district: string
  licenseNumber?: string
}

// Farm & Cattle
export interface Farm {
  id: string
  farmerId: string
  name: string
  location?: string
  latitude?: number
  longitude?: number
  address?: string
}

export type Gender = 'MALE' | 'FEMALE'
export type PregnancyStatus = 'NOT_PREGNANT' | 'PREGNANT' | 'UNKNOWN'

export interface Cattle {
  id: string
  farmId: string
  ownerId: string
  tagNumber: string
  name?: string
  breed: string
  gender: Gender
  dateOfBirth?: string
  estimatedAge?: string
  weight?: number
  identificationMarks?: string
  pregnancyStatus: PregnancyStatus
  isActive: boolean
  photos?: CattlePhoto[]
  photoUrl?: string
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CattlePhoto {
  id: string
  cattleId: string
  photoUrl: string
  isPrimary: boolean
  createdAt: string
}

export interface CattleVaccination {
  id: string
  cattleId: string
  vaccineName: string
  dateGiven: string
  nextDueDate?: string
  notes?: string
}

export interface CreateCattleRequest {
  tagNumber: string
  name?: string
  breed: string
  gender: Gender
  dateOfBirth?: string
  estimatedAge?: string
  weight?: number
  identificationMarks?: string
  pregnancyStatus?: PregnancyStatus
}

// Health Reports
export type ReportStatus = 'PENDING' | 'AI_COMPLETED' | 'VET_REVIEWED' | 'CONFIRMED'

export interface HealthReport {
  id: string
  reportNumber: string
  cattleId: string
  farmerId: string
  state: string
  district: string
  village?: string
  latitude?: number
  longitude?: number
  temperature?: number
  symptomDuration: string
  severity: string
  milkProductionChange?: string
  waterIntakeChange?: string
  recentVaccination?: string
  recentIllness?: string
  recentTreatment?: string
  additionalNotes?: string
  status: ReportStatus
  consultationRequested: boolean
  createdAt: string
  updatedAt: string
  cattle?: Cattle
  symptoms?: HealthReportSymptom[]
  photos?: HealthReportPhoto[]
  prediction?: Prediction
  vetReview?: PredictionReview
}

export interface HealthReportSummary {
  id: string
  reportNumber: string
  status: ReportStatus
  createdAt: string
  predictedDisease?: string
}

export interface HealthReportSymptom {
  id: string
  reportId: string
  symptomName: string
  symptomGroup: string
}

export interface HealthReportPhoto {
  id: string
  reportId: string
  photoUrl: string
}

export interface CreateReportRequest {
  cattleId: string
  state: string
  district: string
  village?: string
  latitude?: number
  longitude?: number
  temperature?: number
  symptomDuration: string
  severity: string
  symptoms: string[]
  milkProductionChange?: string
  waterIntakeChange?: string
  recentVaccination?: string
  recentIllness?: string
  recentTreatment?: string
  additionalNotes?: string
  photos?: File[]
}

// AI Prediction
export type PredictionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'UNAVAILABLE'

export interface Prediction {
  id: string
  reportId: string
  predictionId: string
  provider: string
  modelStatus: string
  isSimulated: boolean
  predictedDisease?: string
  confidence?: number
  confidenceInterpretation?: string
  severity?: string
  supportingSymptoms: string[]
  supporting_symptoms?: string[]
  recommendations: string[]
  possible_conditions?: Array<{ disease: string; confidence: number }>
  imageAssessmentStatus?: string
  imageAssessmentNote?: string
  disclaimer: string
  predictionTimestamp: string
  status: PredictionStatus
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export interface PredictionReview {
  id: string
  reportId: string
  vetId: string
  decision: string
  suspectedDisease?: string
  remarks?: string
  clinicalFindings?: string
  suggestedNextSteps?: string
  followUpDate?: string
  treatmentInfo?: string
  createdAt: string
}

export interface Consultation {
  id: string
  reportId: string
  vetId: string
  farmerId: string
  status: string
  notes?: string
  farmerName?: string
  reportNumber?: string
  createdAt: string
}

export interface OutbreakCluster {
  id: string
  name: string
  status: string
  district: string
  state: string
  radius: number
  animalCount: number
  reportCount: number
  createdAt: string
  latitude: number
  longitude: number
  suspectedDisease?: string
}

export interface Alert {
  id: string
  type: string
  severity: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export interface DashboardStats {
  totalCattle?: number
  activeReports?: number
  pendingReviews?: number
  consultationsCount?: number
  recentReports?: HealthReport[]
  diseaseBreakdown?: Array<{ disease: string; count: number }>
  districtBreakdown?: Array<{ district: string; count: number }>
  dailyTrends?: Array<{ date: string; count: number }>
}
