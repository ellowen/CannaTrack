import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NutritionTable } from '@/types/plant'
import { REVEGETAR_TABLE } from '@/data/revegetar-table'
import { TOPCROP_TABLE } from '@/data/topcrop-table'
import { dateReviver } from '@/lib/storage'

interface NutritionStore {
  /** Tablas custom creadas por el usuario (se persisten) */
  customTables: NutritionTable[]
  /** Tablas oficiales + custom combinadas (getter) */
  tables: NutritionTable[]
  addTable: (table: NutritionTable) => void
  updateTable: (id: string, changes: Partial<NutritionTable>) => void
  removeTable: (id: string) => void
}

const OFFICIAL_TABLES: NutritionTable[] = [REVEGETAR_TABLE, TOPCROP_TABLE]

function mergeTables(customTables: NutritionTable[]): NutritionTable[] {
  // Oficiales primero, luego custom. IDs oficiales no se pueden duplicar.
  const officialIds = new Set(OFFICIAL_TABLES.map((t) => t.id))
  const uniqueCustom = customTables.filter((t) => !officialIds.has(t.id))
  return [...OFFICIAL_TABLES, ...uniqueCustom]
}

export const useNutritionStore = create<NutritionStore>()(
  persist(
    (set) => ({
      customTables: [],
      tables: mergeTables([]),
      addTable: (table) =>
        set((s) => {
          // Solo permitimos agregar tablas no oficiales por este método
          if (table.isOfficial) return s
          const nextCustom = [...s.customTables, table]
          return { customTables: nextCustom, tables: mergeTables(nextCustom) }
        }),
      updateTable: (id, changes) =>
        set((s) => {
          // No se pueden editar tablas oficiales
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
    }),
    {
      name: 'cannatrack-nutrition',
      // Solo persistimos las tablas custom; las oficiales vienen del código
      partialize: (state) => ({ customTables: state.customTables }),
      onRehydrateStorage: () => (state) => {
        // Al rehidratar, reconstruimos `tables` mezclando oficiales + custom
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
