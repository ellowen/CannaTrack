import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AccessTier } from '@/types/plant'
import { computeStreak, XP } from '@/lib/gamification'
import { dateReviver } from '@/lib/storage'

export type ThemePreference = 'system' | 'light' | 'dark'

interface UserStore {
  name: string
  plan: AccessTier
  potVolumeLiters: number
  theme: ThemePreference
  notificationsEnabled: boolean
  onboarded: boolean

  // Gamificación
  streak: number
  bestStreak: number
  lastActivityDate: Date | null
  totalXP: number

  setName: (name: string) => void
  setPlan: (plan: AccessTier) => void
  setPotVolume: (liters: number) => void
  setTheme: (theme: ThemePreference) => void
  setNotificationsEnabled: (v: boolean) => void
  setOnboarded: (v: boolean) => void

  /** Suma XP y actualiza streak. Devuelve el XP ganado (puede tener bonus). */
  addXP: (base: number) => { xpGained: number; streakBonus: number; newStreak: number }
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      name: '',
      plan: 'free' as AccessTier,
      potVolumeLiters: 11,
      theme: 'system',
      notificationsEnabled: false,
      onboarded: false,
      streak: 0,
      bestStreak: 0,
      lastActivityDate: null,
      totalXP: 0,

      setName: (name) => set({ name }),
      setPlan: (plan) => set({ plan }),
      setPotVolume: (potVolumeLiters) => set({ potVolumeLiters }),
      setTheme: (theme) => set({ theme }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setOnboarded: (onboarded) => set({ onboarded }),

      addXP: (base) => {
        const { streak, bestStreak, lastActivityDate, totalXP } = get()
        const today = new Date()
        const { newStreak } = computeStreak(streak, lastActivityDate, today)

        let streakBonus = 0
        if (newStreak === 7)  streakBonus = XP.STREAK_7_BONUS
        if (newStreak === 30) streakBonus = XP.STREAK_30_BONUS

        const xpGained = base + streakBonus
        set({
          totalXP: totalXP + xpGained,
          streak: newStreak,
          bestStreak: Math.max(bestStreak, newStreak),
          lastActivityDate: today,
        })

        return { xpGained, streakBonus, newStreak }
      },
    }),
    {
      name: 'cannatrack-user',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          return str ? JSON.parse(str, dateReviver) : null
        },
        setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)
