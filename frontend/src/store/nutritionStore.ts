import { create } from 'zustand'
import type { NutritionTable } from '@/types/plant'
import { REVEGETAR_TABLE } from '@/data/revegetar-table'

interface NutritionStore {
  tables: NutritionTable[]
  addTable: (table: NutritionTable) => void
}

export const useNutritionStore = create<NutritionStore>()((set) => ({
  tables: [REVEGETAR_TABLE],
  addTable: (table) => set((s) => ({ tables: [...s.tables, table] })),
}))
