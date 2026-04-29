import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export interface PlanState {
  isPro: boolean
  loading: boolean
  activePlantCount: number
  canCreatePlant: boolean
  canUseDiagnosis: boolean
  canUseProTables: boolean
  refetch: () => void
}

const FREE_PLANT_LIMIT = 1

export function usePlan(): PlanState {
  const { user } = useAuth()
  const [isPro, setIsPro]                   = useState(false)
  const [activePlantCount, setActivePlantCount] = useState(0)
  const [loading, setLoading]               = useState(true)

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return }
    const [{ data: prof }, { count }] = await Promise.all([
      supabase.from('profiles').select('is_pro').eq('id', user.id).maybeSingle(),
      supabase.from('plants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active'),
    ])
    setIsPro(prof?.is_pro ?? false)
    setActivePlantCount(count ?? 0)
    setLoading(false)
  }, [user?.id])

  useEffect(() => { fetch() }, [fetch])

  return {
    isPro,
    loading,
    activePlantCount,
    canCreatePlant:   isPro || activePlantCount < FREE_PLANT_LIMIT,
    canUseDiagnosis:  isPro,
    canUseProTables:  isPro,
    refetch:          fetch,
  }
}
