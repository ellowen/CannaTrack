import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AccessTier } from '@/types/plant'

export type ThemePreference = 'system' | 'light' | 'dark'

interface UserStore {
  name: string
  plan: AccessTier
  potVolumeLiters: number
  theme: ThemePreference
  notificationsEnabled: boolean
  onboarded: boolean
  setName: (name: string) => void
  setPlan: (plan: AccessTier) => void
  setPotVolume: (liters: number) => void
  setTheme: (theme: ThemePreference) => void
  setNotificationsEnabled: (v: boolean) => void
  setOnboarded: (v: boolean) => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      name: '',
      plan: 'free' as AccessTier,
      potVolumeLiters: 11,
      theme: 'system',
      notificationsEnabled: false,
      onboarded: false,
      setName: (name) => set({ name }),
      setPlan: (plan) => set({ plan }),
      setPotVolume: (potVolumeLiters) => set({ potVolumeLiters }),
      setTheme: (theme) => set({ theme }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setOnboarded: (onboarded) => set({ onboarded }),
    }),
    { name: 'cannatrack-user' }
  )
)
