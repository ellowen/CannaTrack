import { useNutritionStore } from '@/store/nutritionStore'
import { useSubscription } from '@/hooks/useSubscription'
import { hasProAccess } from '@/lib/plan'
import { canAccessTable } from '@/lib/nutrition-utils'
import type { NutritionTable } from '@/types/plant'

export function useNutritionTable() {
  const { tables } = useNutritionStore()
  const { plan } = useSubscription()
  const accessTier = hasProAccess(plan) ? 'pro' : 'free'

  const availableTables = tables.filter((t) => canAccessTable(t, accessTier))

  function getTableById(id: string): NutritionTable | undefined {
    return tables.find((t) => t.id === id)
  }

  function canAccess(table: NutritionTable): boolean {
    return canAccessTable(table, accessTier)
  }

  return { availableTables, getTableById, canAccess }
}
