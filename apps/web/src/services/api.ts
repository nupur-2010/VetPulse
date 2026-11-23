import axios from 'axios'
import type { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse,
  Cattle,
  CreateCattleRequest,
  HealthReport,
  CreateReportRequest,
  Prediction,
  PredictionReview,
  Consultation,
  VetProfile,
  DashboardStats
} from '@/types'
import { useAuthStore } from '@/store/auth'

const API_BASE = '/api'

// Create axios instance with interceptors
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, logout
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data)
    return response.data
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data)
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },

  getProfile: async (): Promise<AuthResponse> => {
    const response = await api.get<AuthResponse>('/auth/profile')
    return response.data
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await api.post<{ accessToken: string }>('/auth/refresh-token', { refreshToken })
    return response.data
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { currentPassword, newPassword })
  },
}

// Cattle API
export const cattleApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }): Promise<{ cattle: Cattle[]; total: number }> => {
    const response = await api.get<{ cattle: Cattle[]; total: number }>('/cattle', { params })
    return response.data
  },

  get: async (id: string): Promise<Cattle> => {
    const response = await api.get<Cattle>(`/cattle/${id}`)
    return response.data
  },

  create: async (data: CreateCattleRequest): Promise<Cattle> => {
    const response = await api.post<Cattle>('/cattle', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateCattleRequest>): Promise<Cattle> => {
    const response = await api.patch<Cattle>(`/cattle/${id}`, data)
    return response.data
  },

  archive: async (id: string): Promise<void> => {
    await api.delete(`/cattle/${id}`)
  },

  getHistory: async (id: string): Promise<HealthReport[]> => {
    const response = await api.get<HealthReport[]>(`/cattle/${id}/history`)
    return response.data
  },

  addPhoto: async (id: string, photo: File): Promise<Cattle> => {
    const formData = new FormData()
    formData.append('photo', photo)
    const response = await api.post<Cattle>(`/cattle/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  addVaccination: async (id: string, data: { vaccineName: string; dateGiven: string; nextDueDate?: string; notes?: string }): Promise<void> => {
    await api.post(`/cattle/${id}/vaccinations`, data)
  },
}

// Reports API
export const reportsApi = {
  create: async (data: CreateReportRequest): Promise<HealthReport> => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'photos') {
        return
      }
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value))
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value))
      }
    })
    if (data.photos) {
      data.photos.forEach((photo) => {
        formData.append('photos', photo)
      })
    }
    const response = await api.post<HealthReport>('/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  list: async (params?: { page?: number; limit?: number; status?: string; district?: string }): Promise<{ reports: HealthReport[]; total: number }> => {
    const response = await api.get<{ reports: HealthReport[]; total: number }>('/reports', { params })
    return response.data
  },

  get: async (id: string): Promise<HealthReport> => {
    const response = await api.get<HealthReport>(`/reports/${id}`)
    return response.data
  },

  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/reports/stats')
    return response.data
  },

  getPrediction: async (id: string): Promise<Prediction> => {
    const response = await api.get<Prediction>(`/reports/${id}/prediction`)
    return response.data
  },

  requestConsultation: async (reportId: string, notes?: string): Promise<void> => {
    await api.post(`/reports/${reportId}/consultation`, { notes })
  },
}

// Vet API
export const vetApi = {
  list: async (params?: { district?: string; specialization?: string }): Promise<{ veterinarians: VetProfile[] }> => {
    const response = await api.get<{ veterinarians: VetProfile[] }>('/veterinarians', { params })
    return response.data
  },

  get: async (id: string): Promise<VetProfile> => {
    const response = await api.get<VetProfile>(`/veterinarians/${id}`)
    return response.data
  },

  updateProfile: async (data: Partial<VetProfile>): Promise<VetProfile> => {
    const response = await api.patch<VetProfile>('/veterinarians/profile', data)
    return response.data
  },

  setAvailability: async (data: { date: string; startTime: string; endTime: string }[]): Promise<void> => {
    await api.post('/veterinarians/availability', { slots: data })
  },
}

// Reviews API
export const reviewsApi = {
  create: async (data: {
    reportId: string
    decision: string
    suspectedDisease?: string
    remarks?: string
    clinicalFindings?: string
    suggestedNextSteps?: string
    followUpDate?: string
    treatmentInfo?: string
  }): Promise<PredictionReview> => {
    const response = await api.post<PredictionReview>('/reviews', data)
    return response.data
  },

  getForReport: async (reportId: string): Promise<PredictionReview> => {
    const response = await api.get<PredictionReview>(`/reviews/report/${reportId}`)
    return response.data
  },
}

// Consultations API
export const consultationsApi = {
  listFarmer: async (): Promise<{ consultations: Consultation[] }> => {
    const response = await api.get<{ consultations: Consultation[] }>('/consultations/farmer')
    return response.data
  },

  listVet: async (): Promise<{ consultations: Consultation[] }> => {
    const response = await api.get<{ consultations: Consultation[] }>('/consultations/vet')
    return response.data
  },

  get: async (id: string): Promise<Consultation> => {
    const response = await api.get<Consultation>(`/consultations/${id}`)
    return response.data
  },

  update: async (id: string, data: { status?: string; notes?: string }): Promise<Consultation> => {
    const response = await api.patch<Consultation>(`/consultations/${id}`, data)
    return response.data
  },

  addFeedback: async (id: string, data: { rating: number; feedback?: string }): Promise<void> => {
    await api.post(`/consultations/${id}/feedback`, data)
  },
}

// Analytics API
export const analyticsApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/analytics/stats')
    return response.data
  },

  getDiseases: async (params?: { period?: string; district?: string }): Promise<{ diseases: Array<{ disease: string; count: number; percentage: number }> }> => {
    const response = await api.get<{ diseases: Array<{ disease: string; count: number; percentage: number }> }>('/analytics/diseases', { params })
    return response.data
  },

  getGeographic: async (params?: { period?: string }): Promise<{ districts: Array<{ district: string; state: string; count: number; lat: number; lng: number }> }> => {
    const response = await api.get<{ districts: Array<{ district: string; state: string; count: number; lat: number; lng: number }> }>('/analytics/geographic', { params })
    return response.data
  },

  getClusters: async (): Promise<{ clusters: OutbreakCluster[] }> => {
    const response = await api.get<{ clusters: OutbreakCluster[] }>('/analytics/clusters')
    return response.data
  },

  getCluster: async (id: string): Promise<OutbreakCluster> => {
    const response = await api.get<OutbreakCluster>(`/analytics/clusters/${id}`)
    return response.data
  },

  updateClusterStatus: async (id: string, status: string): Promise<OutbreakCluster> => {
    const response = await api.patch<OutbreakCluster>(`/analytics/clusters/${id}`, { status })
    return response.data
  },

  detectOutbreaks: async (): Promise<{ triggered: boolean; clustersCreated: number }> => {
    const response = await api.post<{ triggered: boolean; clustersCreated: number }>('/analytics/detect-outbreaks')
    return response.data
  },

  getAlerts: async (): Promise<{ alerts: Alert[] }> => {
    const response = await api.get<{ alerts: Alert[] }>('/analytics/alerts')
    return response.data
  },

  getHighRiskAreas: async (): Promise<{ areas: Array<{ district: string; state: string; riskLevel: string; activeCases: number }> }> => {
    const response = await api.get<{ areas: Array<{ district: string; state: string; riskLevel: string; activeCases: number }> }>('/analytics/high-risk-areas')
    return response.data
  },
}

// Admin API
export const adminApi = {
  getUsers: async (params?: { role?: string; isActive?: boolean }): Promise<{ users: any[]; total: number }> => {
    const response = await api.get<{ users: any[]; total: number }>('/admin/users', { params })
    return response.data
  },

  toggleUserStatus: async (userId: string): Promise<void> => {
    await api.patch(`/admin/users/${userId}`)
  },

  getDashboard: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/admin/dashboard')
    return response.data
  },
}

// AI Service API (direct call for health info)
export const aiServiceApi = {
  getHealth: async (): Promise<{ status: string; provider: string; modelStatus: string }> => {
    const response = await axios.get('/health', { baseURL: 'http://localhost:8000' })
    return response.data
  },

  getModelInfo: async (): Promise<{ name: string; version: string; status: string; isSimulated: boolean }> => {
    const response = await axios.get('/model-info', { baseURL: 'http://localhost:8000' })
    return response.data
  },
}

// Helper types
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
