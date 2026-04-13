import { useNutritionStore } from '@/store/nutritionStore'
import { useUserStore } from '@/store/userStore'
import { canAccessTable } from '@/lib/nutrition-utils'
import type { NutritionTable } from '@/types/plant'

export function useNutritionTable() {
  const { tables } = useNutritionStore()
  const { plan } = useUserStore()

  const availableTables = tables.filter((t) => canAccessTable(t, plan))

  function getTableById(id: string): NutritionTable | undefined {
    return tables.find((t) => t.id === id)
  }

  function canAccess(table: NutritionTable): boolean {
    return canAccessTable(table, plan)
  }

  return { availableTables, getTableById, canAccess }
}
