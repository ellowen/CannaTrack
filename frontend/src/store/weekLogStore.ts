import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WeekLog } from '@/types/weekLog'
import { dateReviver } from '@/lib/storage'

interface WeekLogStore {
  logs: WeekLog[]
  addLog: (log: Omit<WeekLog, 'id'>) => void
  updateLog: (id: string, changes: Partial<Pick<WeekLog, 'notes' | 'photoDataUrl'>>) => void
  deleteLog: (id: string) => void
}

export const useWeekLogStore = create<WeekLogStore>()(
  persist(
    (set) => ({
      logs: [],
      addLog: (log) =>
        set((s) => ({
          logs: [...s.logs, { ...log, id: crypto.randomUUID() }],
        })),
      updateLog: (id, changes) =>
        set((s) => ({
          logs: s.logs.map((l) => (l.id === id ? { ...l, ...changes } : l)),
        })),
      deleteLog: (id) =>
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),
    }),
    {
      name: 'cannatrack-weeklogs',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          return str ? JSON.parse(str, dateReviver) : null
        },
        setItem: (name, value) =>
          localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)
