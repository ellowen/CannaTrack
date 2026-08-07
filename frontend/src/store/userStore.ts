import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getLevelInfo } from '@/lib/gamification'
import { dateReviver } from '@/lib/storage'
import type { Language } from '@/i18n'
import { i18n } from '@/i18n'

export type ThemePreference = 'system' | 'light' | 'dark'

interface UserStore {
  userId: string | null
  email: string | null
  name: string
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
  setPotVolume: (liters: number) => void
  setTheme: (theme: ThemePreference) => void
  setNotificationsEnabled: (v: boolean) => void
  setReminderHour: (hour: number) => void
  setLanguage: (lang: Language) => void
  setOnboarded: (v: boolean) => void
  updatePreferences: (prefs: Partial<{ notificationsEnabled: boolean; onboarded: boolean }>) => void
  /**
   * Aplica el premio de UNA tarea recien completada usando los valores
   * REALES devueltos por la RPC de Supabase (handle_task_completion) —
   * nunca un calculo local. streak, si viene, reemplaza (no suma) al
   * valor anterior porque la DB devuelve la racha absoluta, no un delta.
   */
  applyTaskReward: (xpGained: number, newStreak: number | null) => void
  /**
   * Sincroniza el cache local con el estado REAL de profiles (fuente de
   * verdad) — se llama al cargar sesion/refresh/login, para que el cache
   * nunca quede desincronizado de la DB entre pestañas o dispositivos.
   */
  syncGamificationFromProfile: (xp: number, streakDays: number) => void

  // Selectors
  getLevel: () => ReturnType<typeof getLevelInfo>
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      userId: null,
      email: null,
      name: '',
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

      applyTaskReward: (xpGained, newStreak) => {
        const { bestStreak, totalXP } = get()
        set({
          totalXP: totalXP + xpGained,
          ...(newStreak != null ? { streak: newStreak, bestStreak: Math.max(bestStreak, newStreak) } : {}),
          lastActivityDate: new Date(),
        })
      },

      syncGamificationFromProfile: (xp, streakDays) => {
        set((s) => ({
          totalXP: xp,
          streak: streakDays,
          bestStreak: Math.max(s.bestStreak, streakDays),
        }))
      },

      getLevel: () => getLevelInfo(get().totalXP),
    }),
    {
      name: 'cultitrack-user',
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
