import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, FarmerProfile, VetProfile, AuthResponse } from '@/types'

interface AuthState {
  user: User | null
  farmerProfile: FarmerProfile | null
  vetProfile: VetProfile | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (data: AuthResponse) => void
  logout: () => void
  setTokens: (accessToken: string, refreshToken?: string) => void
  setLoading: (loading: boolean) => void
  updateFarmerProfile: (profile: Partial<FarmerProfile>) => void
  updateVetProfile: (profile: Partial<VetProfile>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      farmerProfile: null,
      vetProfile: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: (data: AuthResponse) => {
        set({
          user: data.user,
          farmerProfile: data.farmerProfile || null,
          vetProfile: data.vetProfile || null,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || null,
          isAuthenticated: true,
          isLoading: false,
        })
      },

      setTokens: (accessToken: string, refreshToken?: string) => {
        set((state) => ({
          accessToken,
          refreshToken: refreshToken !== undefined ? refreshToken : state.refreshToken,
          isAuthenticated: true,
        }))
      },

      logout: () => {
        set({
          user: null,
          farmerProfile: null,
          vetProfile: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      updateFarmerProfile: (profile: Partial<FarmerProfile>) => {
        set((state) => ({
          farmerProfile: state.farmerProfile 
            ? { ...state.farmerProfile, ...profile }
            : null,
        }))
      },

      updateVetProfile: (profile: Partial<VetProfile>) => {
        set((state) => ({
          vetProfile: state.vetProfile 
            ? { ...state.vetProfile, ...profile }
            : null,
        }))
      },
    }),
    {
      name: 'vetpulse-auth',
      partialize: (state) => ({
        user: state.user,
        farmerProfile: state.farmerProfile,
        vetProfile: state.vetProfile,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
