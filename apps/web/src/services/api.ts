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
  DashboardStats,
  OutbreakCluster,
  Alert
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

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: string | null) => void
  reject: (error: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Response interceptor for error handling, data unwrapping, and automatic token refresh
api.interceptors.response.use(
  (response) => {
    // If response has { success: true, data: actualData }, unwrap it for frontend compatibility
    if (response.data && response.data.success === true && response.data.data !== undefined) {
      response.data = response.data.data
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error)
    }

    const url = originalRequest?.url || ''

    // Do not attempt token refresh for login or register endpoints
    if (url.includes('/auth/login') || url.includes('/auth/register')) {
      return Promise.reject(error)
    }

    // If the refresh token request itself failed with 401, or if request was already retried
    if (url.includes('/auth/refresh-token') || originalRequest?._retry) {
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    const currentRefreshToken = useAuthStore.getState().refreshToken
    if (!currentRefreshToken) {
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string | null>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          if (token && originalRequest?.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`
          }
          return api(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    if (originalRequest) {
      originalRequest._retry = true
    }
    isRefreshing = true

    try {
      // Call refresh endpoint directly using raw axios to avoid interceptor recursion
      const response = await axios.post('/api/auth/refresh-token', {
        refreshToken: currentRefreshToken,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const responseData = response.data?.data || response.data
      const newAccessToken = responseData?.accessToken
      const newRefreshToken = responseData?.refreshToken || currentRefreshToken

      if (!newAccessToken) {
        throw new Error('No access token returned from refresh endpoint')
      }

      useAuthStore.getState().setTokens(newAccessToken, newRefreshToken)

      if (originalRequest?.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      }

      processQueue(null, newAccessToken)
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login'
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
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

  logout: async (refreshToken?: string): Promise<void> => {
    const token = refreshToken || useAuthStore.getState().refreshToken
    await api.post('/auth/logout', { refreshToken: token || undefined })
  },

  getProfile: async (): Promise<AuthResponse> => {
    const response = await api.get<AuthResponse>('/auth/profile')
    return response.data
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> => {
    const response = await api.post<{ accessToken: string; refreshToken?: string }>('/auth/refresh-token', { refreshToken })
    return response.data
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { currentPassword, newPassword })
  },
}

// Cattle API
export const cattleApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }): Promise<{ cattle: Cattle[]; total: number }> => {
    const response = await api.get('/cattle', { params })
    const res = response.data as any
    if (Array.isArray(res)) {
      return { cattle: res, total: res.length }
    }
    if (res?.cattle && Array.isArray(res.cattle)) {
      return { cattle: res.cattle, total: res.total ?? res.cattle.length }
    }
    if (res?.data && Array.isArray(res.data)) {
      return { cattle: res.data, total: res.total ?? res.pagination?.total ?? res.data.length }
    }
    return { cattle: [], total: 0 }
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
      headers: { 'Content-Type': undefined },
    })
    return response.data
  },

  list: async (params?: { page?: number; limit?: number; status?: string; district?: string }): Promise<{ reports: HealthReport[]; total: number }> => {
    const response = await api.get('/reports', { params })
    const res = response.data as any
    if (Array.isArray(res)) {
      return { reports: res, total: res.length }
    }
    if (res?.reports && Array.isArray(res.reports)) {
      return { reports: res.reports, total: res.total ?? res.reports.length }
    }
    if (res?.data && Array.isArray(res.data)) {
      return { reports: res.data, total: res.total ?? res.pagination?.total ?? res.data.length }
    }
    return { reports: [], total: 0 }
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
    const response = await api.get('/veterinarians', { params })
    const res = response.data as any
    if (Array.isArray(res)) return { veterinarians: res }
    if (res?.veterinarians && Array.isArray(res.veterinarians)) return { veterinarians: res.veterinarians }
    if (res?.data && Array.isArray(res.data)) return { veterinarians: res.data }
    return { veterinarians: [] }
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
    const response = await api.get('/consultations/farmer')
    const res = response.data as any
    if (Array.isArray(res)) return { consultations: res }
    if (res?.consultations && Array.isArray(res.consultations)) return { consultations: res.consultations }
    if (res?.data && Array.isArray(res.data)) return { consultations: res.data }
    return { consultations: [] }
  },

  listVet: async (): Promise<{ consultations: Consultation[] }> => {
    const response = await api.get('/consultations/vet')
    const res = response.data as any
    if (Array.isArray(res)) return { consultations: res }
    if (res?.consultations && Array.isArray(res.consultations)) return { consultations: res.consultations }
    if (res?.data && Array.isArray(res.data)) return { consultations: res.data }
    return { consultations: [] }
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
    const response = await api.get<{ clusters: OutbreakCluster[] } | OutbreakCluster[]>('/analytics/clusters')
    const data = response.data as any
    // Backend returns a plain array from the DBSCAN service; normalize to { clusters }
    const list = Array.isArray(data) ? data : data?.clusters || []
    return { clusters: list }
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
    const data = response.data as any
    const clusters = Array.isArray(data) ? data : data?.clusters || []
    return { triggered: clusters.length > 0, clustersCreated: Array.isArray(data) ? data.length : (data?.clustersCreated ?? 0) }
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
  getUsers: async (params?: { role?: string; isActive?: boolean; page?: number; limit?: number; search?: string }): Promise<{ users: any[]; total: number }> => {
    const response = await api.get('/admin/users', { params })
    const res = response.data as any
    if (res?.data && Array.isArray(res.data)) {
      return { users: res.data, total: res.pagination?.total ?? res.data.length }
    }
    if (res?.users && Array.isArray(res.users)) {
      return { users: res.users, total: res.total ?? res.users.length }
    }
    if (Array.isArray(res)) {
      return { users: res, total: res.length }
    }
    return { users: [], total: 0 }
  },

  toggleUserStatus: async (userId: string, isActive?: boolean): Promise<void> => {
    await api.patch(`/admin/users/${userId}`, { isActive })
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

  getModelInfo: async (): Promise<{ name: string; version: string; status: string; classes: string[]; symptom_model_loaded: boolean; vision_model_loaded: boolean }> => {
    const response = await axios.get('/model-info', { baseURL: 'http://localhost:8000' })
    return response.data
  },
}

// Helper types re-exported
export type { OutbreakCluster, Alert, DashboardStats } from '@/types'
