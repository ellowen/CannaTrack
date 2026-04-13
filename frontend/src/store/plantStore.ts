import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Plant } from '@/types/plant'

const dateReviver = (_: string, value: unknown): unknown => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value)
  }
  return value
}

interface PlantStore {
  plants: Plant[]
  addPlant: (plant: Plant) => void
  updatePlant: (id: string, changes: Partial<Plant>) => void
  removePlant: (id: string) => void
}

export const usePlantStore = create<PlantStore>()(
  persist(
    (set) => ({
      plants: [],
      addPlant: (plant) => set((s) => ({ plants: [...s.plants, plant] })),
      updatePlant: (id, changes) =>
        set((s) => ({
          plants: s.plants.map((p) => (p.id === id ? { ...p, ...changes } : p)),
        })),
      removePlant: (id) =>
        set((s) => ({ plants: s.plants.filter((p) => p.id !== id) })),
    }),
    {
      name: 'cannatrack-plants',
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
