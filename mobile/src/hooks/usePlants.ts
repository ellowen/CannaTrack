import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Plant } from '@shared/types/plant'

export function usePlants() {
  const { user } = useAuth()
  const [plants, setPlants]   = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setPlants((data ?? []).map(rowToPlant))
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  return { plants, loading, error, refetch: fetch }
}

function rowToPlant(row: Record<string, unknown>): Plant {
  return {
    id:                  row.id as string,
    name:                row.name as string,
    genetics:            row.genetics as string,
    geneticType:         row.genetic_type as Plant['geneticType'],
    sex:                 (row.sex as Plant['sex']) ?? 'unknown',
    startDate:           new Date(row.start_date as string),
    floraStartDate:      row.flora_start_date ? new Date(row.flora_start_date as string) : undefined,
    autoFlowerTotalDays: (row.auto_flower_total_days as number) ?? 75,
    location:            (row.location as Plant['location']) ?? 'indoor',
    potCount:            (row.pot_count as number) ?? 1,
    potVolumeLiters:     (row.pot_volume_liters as number) ?? 11,
    nutritionTableId:    (row.nutrition_table_id as string) ?? 'revegetar',
    availableProducts:   (row.available_products as string[]) ?? [],
    status:              (row.status as Plant['status']) ?? 'active',
    notes:               (row.notes as string) ?? '',
  }
}
