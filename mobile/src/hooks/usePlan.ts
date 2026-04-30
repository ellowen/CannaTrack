import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCustomerInfo, hasPro, syncProToSupabase } from '@/lib/purchases'
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
  const [isPro, setIsPro]                       = useState(false)
  const [activePlantCount, setActivePlantCount] = useState(0)
  const [loading, setLoading]                   = useState(true)

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return }

    // Consultar plantas activas y perfil en paralelo
    const [{ count }, { data: prof }, customerInfo] = await Promise.all([
      supabase.from('plants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active'),
      supabase.from('profiles').select('is_pro').eq('id', user.id).maybeSingle(),
      getCustomerInfo(),
    ])

    setActivePlantCount(count ?? 0)

    if (customerInfo) {
      // RevenueCat disponible — es la fuente de verdad
      const rcIsPro = hasPro(customerInfo)
      setIsPro(rcIsPro)
      // Sincronizar con Supabase si hay diferencia (sin await — fire and forget)
      if (rcIsPro !== (prof?.is_pro ?? false)) {
        void syncProToSupabase(rcIsPro)
      }
    } else {
      // RevenueCat no configurado (dev sin API key) — fallback a Supabase
      setIsPro(prof?.is_pro ?? false)
    }

    setLoading(false)
  }, [user?.id])

  useEffect(() => { fetch() }, [fetch])

  return {
    isPro,
    loading,
    activePlantCount,
    canCreatePlant:  isPro || activePlantCount < FREE_PLANT_LIMIT,
    canUseDiagnosis: isPro,
    canUseProTables: isPro,
    refetch:         fetch,
  }
}
