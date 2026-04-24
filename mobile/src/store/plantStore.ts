import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Plant } from '@shared/types/plant'
import { createAsyncStorage } from '@/lib/storage'

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
  selectPlant: (id: string | null) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  setFilter: (f: 'active' | 'all') => void
  setPlants: (plants: Plant[]) => void

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
      selectPlant: (id) => set({ selectedPlantId: id }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilter: (filter) => set({ filter }),
      setPlants: (plants) => set({ plants }),

      getActivePlants: () => get().plants.filter((p) => p.status === 'active'),
      getPlantById: (id) => get().plants.find((p) => p.id === id),
      getPlantsCount: () => get().plants.length,
    }),
    {
      name: 'cannatrack-plants',
      partialize: (state) => ({
        plants: state.plants,
        selectedPlantId: state.selectedPlantId,
        filter: state.filter,
      }),
      storage: createAsyncStorage(),
    }
  )
)

/**
 * Memoized selector for active plants only.
 * Use this instead of usePlantStore(s => s.plants.filter(p => p.status === 'active'))
 * to avoid creating a new array on every render.
 */
export const useActivePlants = () =>
  usePlantStore((s) => s.plants.filter((p) => p.status === 'active'))
