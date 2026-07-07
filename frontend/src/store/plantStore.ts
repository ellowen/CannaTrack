import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Plant } from '@/types/plant'
import { dateReviver } from '@/lib/storage'

interface PlantStore {
  plants: Plant[]
  selectedPlantId: string | null
  loading: boolean
  error: string | null
  filter: 'active' | 'all'

  // Acciones
  addPlant: (plant: Plant) => void
  updatePlant: (id: string, changes: Partial<Plant>) => void
  removePlant: (id: string) => void
  setPlants: (plants: Plant[]) => void
  selectPlant: (id: string | null) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  setFilter: (f: 'active' | 'all') => void

  // Selectors
  getActivePlants: () => Plant[]
  getPlantById: (id: string) => Plant | undefined
  getPlantsCount: () => number
}

export const usePlantStore = create<PlantStore>()(
  persist(
    (set, get) => ({
      plants: [],
      selectedPlantId: null,
      loading: false,
      error: null,
      filter: 'active',

      addPlant: (plant) => set((s) => ({ plants: [...s.plants, plant] })),
      updatePlant: (id, changes) =>
        set((s) => ({
          plants: s.plants.map((p) => (p.id === id ? { ...p, ...changes } : p)),
        })),
      removePlant: (id) =>
        set((s) => ({ plants: s.plants.filter((p) => p.id !== id) })),
      setPlants: (plants) => set({ plants }),
      selectPlant: (id) => set({ selectedPlantId: id }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilter: (filter) => set({ filter }),

      getActivePlants: () => get().plants.filter((p) => p.status === 'active'),
      getPlantById: (id) => get().plants.find((p) => p.id === id),
      getPlantsCount: () => get().plants.length,
    }),
    {
      name: 'cultitrack-plants',
      partialize: (state) => ({
        plants: state.plants,
        selectedPlantId: state.selectedPlantId,
        filter: state.filter,
      }),
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
