import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AccessTier } from '@/types/plant'
import { computeStreak, getLevelInfo, XP } from '@/lib/gamification'
import { dateReviver } from '@/lib/storage'
import type { Language } from '@/i18n'
import { i18n } from '@/i18n'

export type ThemePreference = 'system' | 'light' | 'dark'

interface UserStore {
  userId: string | null
  email: string | null
  name: string
  plan: AccessTier
  potVolumeLiters: number
  theme: ThemePreference
  notificationsEnabled: boolean
  reminderHour: number
  language: Language
  onboarded: boolean

  // Gamificación
  streak: number
  bestStreak: number
  lastActivityDate: Date | null
  totalXP: number

  // Acciones
  setUser: (userId: string, email: string, name: string) => void
  setName: (name: string) => void
  setPlan: (plan: AccessTier) => void
  updatePlan: (plan: AccessTier) => void
  setPotVolume: (liters: number) => void
  setTheme: (theme: ThemePreference) => void
  setNotificationsEnabled: (v: boolean) => void
  setReminderHour: (hour: number) => void
  setLanguage: (lang: Language) => void
  setOnboarded: (v: boolean) => void
  updatePreferences: (prefs: Partial<{ notificationsEnabled: boolean; onboarded: boolean }>) => void
  addXP: (base: number) => { xpGained: number; streakBonus: number; newStreak: number }

  // Selectors
  getLevel: () => ReturnType<typeof getLevelInfo>
  getStreakBonusXP: () => number
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      userId: null,
      email: null,
      name: '',
      plan: 'free' as AccessTier,
      potVolumeLiters: 11,
      theme: 'system',
      notificationsEnabled: false,
      reminderHour: 9,
      language: 'es' as Language,
      onboarded: false,
      streak: 0,
      bestStreak: 0,
      lastActivityDate: null,
      totalXP: 0,

      setUser: (userId, email, name) => set({ userId, email, name }),
      setName: (name) => set({ name }),
      setPlan: (plan) => set({ plan }),
      updatePlan: (plan) => set({ plan }),
      setPotVolume: (potVolumeLiters) => set({ potVolumeLiters }),
      setTheme: (theme) => set({ theme }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setReminderHour: (reminderHour) => set({ reminderHour }),
      setLanguage: (language) => {
        set({ language })
        void i18n.changeLanguage(language)
      },
      setOnboarded: (onboarded) => set({ onboarded }),
      updatePreferences: (prefs) => set((s) => ({ ...s, ...prefs })),

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

      getLevel: () => getLevelInfo(get().totalXP),
      getStreakBonusXP: () => {
        const { streak } = get()
        if (streak >= 30) return XP.STREAK_30_BONUS
        if (streak >= 7)  return XP.STREAK_7_BONUS
        return 0
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
