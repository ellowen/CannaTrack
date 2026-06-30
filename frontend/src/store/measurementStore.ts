import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MeasurementLog } from '@/types/measurement'
import { dateReviver } from '@/lib/storage'

interface MeasurementStore {
  logs: MeasurementLog[]
  addLog: (log: Omit<MeasurementLog, 'id'>) => MeasurementLog
  deleteLog: (id: string) => void
  updateMeasurement: (plantId: string, measurement: any) => void
  setLogs: (logs: MeasurementLog[]) => void
}

export const useMeasurementStore = create<MeasurementStore>()(
  persist(
    (set) => ({
      logs: [],
      addLog: (log) => {
        const newLog: MeasurementLog = { ...log, id: crypto.randomUUID() }
        set((s) => ({ logs: [newLog, ...s.logs] }))
        return newLog
      },
      deleteLog: (id) =>
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),
      updateMeasurement: (plantId, measurement) =>
        set((s) => ({
          logs: [
            ...s.logs.filter((l) => l.plantId !== plantId || l.id !== measurement.id),
            { ...measurement, plantId },
          ],
        })),
      setLogs: (logs) => set({ logs }),
    }),
    {
      name: 'cannatrack-measurements',
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
