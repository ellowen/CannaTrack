import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NutritionTable, AccessTier } from '@/types/plant'
import { REVEGETAR_TABLE } from '@/data/revegetar-table'
import { TOPCROP_TABLE } from '@/data/topcrop-table'
import { dateReviver } from '@/lib/storage'

interface NutritionStore {
  customTables: NutritionTable[]
  tables: NutritionTable[]
  selectedTableId: string
  loading: boolean

  // Acciones
  setTables: (tables: NutritionTable[]) => void
  setSelectedTable: (id: string) => void
  addTable: (table: NutritionTable) => void
  addCustomTable: (table: NutritionTable) => void
  updateTable: (id: string, changes: Partial<NutritionTable>) => void
  removeTable: (id: string) => void
  setLoading: (v: boolean) => void

  // Selectors
  getTableById: (id: string) => NutritionTable | undefined
  getAvailableTables: (plan: AccessTier) => NutritionTable[]
}

const OFFICIAL_TABLES: NutritionTable[] = [REVEGETAR_TABLE, TOPCROP_TABLE]

function mergeTables(customTables: NutritionTable[]): NutritionTable[] {
  const officialIds = new Set(OFFICIAL_TABLES.map((t) => t.id))
  const uniqueCustom = customTables.filter((t) => !officialIds.has(t.id))
  return [...OFFICIAL_TABLES, ...uniqueCustom]
}

export const useNutritionStore = create<NutritionStore>()(
  persist(
    (set, get) => ({
      customTables: [],
      tables: mergeTables([]),
      selectedTableId: 'revegetar',
      loading: false,

      setTables: (tables) => set({ tables }),
      setSelectedTable: (selectedTableId) => set({ selectedTableId }),
      addTable: (table) =>
        set((s) => {
          if (table.isOfficial) return s
          const nextCustom = [...s.customTables, table]
          return { customTables: nextCustom, tables: mergeTables(nextCustom) }
        }),
      addCustomTable: (table) =>
        set((s) => {
          if (table.isOfficial) return s
          const nextCustom = [...s.customTables, table]
          return { customTables: nextCustom, tables: mergeTables(nextCustom) }
        }),
      updateTable: (id, changes) =>
        set((s) => {
          const isOfficial = OFFICIAL_TABLES.some((t) => t.id === id)
          if (isOfficial) return s
          const nextCustom = s.customTables.map((t) =>
            t.id === id ? { ...t, ...changes, isOfficial: false } : t,
          )
          return { customTables: nextCustom, tables: mergeTables(nextCustom) }
        }),
      removeTable: (id) =>
        set((s) => {
          const isOfficial = OFFICIAL_TABLES.some((t) => t.id === id)
          if (isOfficial) return s
          const nextCustom = s.customTables.filter((t) => t.id !== id)
          return { customTables: nextCustom, tables: mergeTables(nextCustom) }
        }),
      setLoading: (loading) => set({ loading }),

      getTableById: (id) => get().tables.find((t) => t.id === id),
      getAvailableTables: (plan) => {
        const tables = get().tables
        if (plan === 'pro') return tables
        return tables.filter((t) => t.accessTier === 'free')
      },
    }),
    {
      name: 'cannatrack-nutrition',
      partialize: (state) => ({
        customTables: state.customTables,
        selectedTableId: state.selectedTableId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.tables = mergeTables(state.customTables)
        }
      },
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          return str ? JSON.parse(str, dateReviver) : null
        },
        setItem: (name, value) =>
          localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
)
