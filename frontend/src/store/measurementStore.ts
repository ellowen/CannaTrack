import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MeasurementLog } from '@/types/measurement'
import { dateReviver } from '@/lib/storage'

interface MeasurementStore {
  logs: MeasurementLog[]
  addLog: (log: Omit<MeasurementLog, 'id'>) => void
  deleteLog: (id: string) => void
  updateMeasurement: (plantId: string, measurement: any) => void
}

export const useMeasurementStore = create<MeasurementStore>()(
  persist(
    (set) => ({
      logs: [],
      addLog: (log) =>
        set((s) => ({ logs: [{ ...log, id: crypto.randomUUID() }, ...s.logs] })),
      deleteLog: (id) =>
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),
      updateMeasurement: (plantId, measurement) =>
        set((s) => ({
          logs: [
            ...s.logs.filter((l) => l.plantId !== plantId || l.id !== measurement.id),
            { ...measurement, plantId },
          ],
        })),
    }),
    {
      name: 'cultitrack-measurements',
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
