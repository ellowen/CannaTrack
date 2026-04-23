import { useState, useEffect } from 'react'
import type { NutritionTable } from '@shared/types/plant'
import { REVEGETAR_TABLE } from '@shared/data/revegetar-table'
import { TOPCROP_TABLE } from '@shared/data/topcrop-table'

export function useNutritionTables() {
  const [tables, setTables] = useState<NutritionTable[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Para MVP: hardcodeadas. Futuro: traer de Supabase con plan Pro check
    setTables([REVEGETAR_TABLE, TOPCROP_TABLE])
    setLoading(false)
  }, [])

  return { tables, loading }
}
