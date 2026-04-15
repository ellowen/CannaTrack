import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WeekLog } from '@/types/weekLog'
import { dateReviver } from '@/lib/storage'

interface WeekLogStore {
  logs: WeekLog[]
  addLog: (log: Omit<WeekLog, 'id'>) => void
  updateLog: (id: string, updates: Partial<Pick<WeekLog, 'notes' | 'photoDataUrl'>>) => void
  deleteLog: (id: string) => void
}

export const useWeekLogStore = create<WeekLogStore>()(
  persist(
    (set) => ({
      logs: [],

      addLog: (log) =>
        set((s) => ({
          logs: [{ ...log, id: crypto.randomUUID() }, ...s.logs],
        })),

      updateLog: (id, updates) =>
        set((s) => ({
          logs: s.logs.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        })),

      deleteLog: (id) =>
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),
    }),
    {
      name: 'cannatrack-weeklogs',
      storage: {
        getItem: (key) => {
          const raw = localStorage.getItem(key)
          return raw ? JSON.parse(raw, dateReviver) : null
        },
        setItem: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
        removeItem: (key) => localStorage.removeItem(key),
      },
    }
  )
)
