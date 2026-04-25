import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NutritionTable, AccessTier } from '@shared/types/plant'
import { REVEGETAR_TABLE } from '@shared/data/revegetar-table'
import { TOPCROP_TABLE } from '@shared/data/topcrop-table'
import { createAsyncStorage } from '@/lib/storage'

interface NutritionStore {
  customTables: NutritionTable[]
  tables: NutritionTable[]
  selectedTableId: string
  loading: boolean
  tablesLoaded: boolean

  // Acciones
  setTables: (tables: NutritionTable[]) => void
  setSelectedTable: (id: string) => void
  addTable: (table: NutritionTable) => void
  addCustomTable: (table: NutritionTable) => void
  updateTable: (id: string, changes: Partial<NutritionTable>) => void
  removeTable: (id: string) => void
  setLoading: (v: boolean) => void
  ensureTablesLoaded: () => void

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
      tables: [], // Start empty, load on demand
      selectedTableId: 'revegetar',
      loading: false,
      tablesLoaded: false,

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

      ensureTablesLoaded: () => {
        const state = get()
        if (!state.tablesLoaded) {
          // Load official tables when first needed (not on app start)
          set({ tables: mergeTables(state.customTables), tablesLoaded: true })
        }
      },

      getTableById: (id) => get().tables.find((t) => t.id === id),
      getAvailableTables: (plan) => {
        const state = get()
        state.ensureTablesLoaded() // Lazy-load if not already loaded
        const tables = state.tables
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
          // Don't eagerly load tables on rehydration - wait until ensureTablesLoaded is called
          state.tables = []
          state.tablesLoaded = false
        }
      },
      storage: createAsyncStorage(),
    },
  ),
)
