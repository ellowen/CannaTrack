/**
 * Quota mensual de diagnosticos IA.
 * Lee la tabla ai_usage para el mes actual.
 * Free: 5/mes  |  Pro: 30/mes
 */
import { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { usePlan } from './usePlan'

const LIMIT_FREE = 5
const LIMIT_PRO  = 30

export interface DiagnosisQuota {
  used:        number
  limit:       number
  remaining:   number
  isAtLimit:   boolean
  loading:     boolean
  refetch:     () => Promise<void>
}

export function useDiagnosisQuota(): DiagnosisQuota {
  const { user }    = useAuth()
  const { isPro }   = usePlan()
  const [used, setUsed]       = useState(0)
  const [loading, setLoading] = useState(true)

  const month = format(new Date(), 'yyyy-MM')
  const limit = isPro ? LIMIT_PRO : LIMIT_FREE

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('ai_usage')
        .select('diagnosis_count')
        .eq('user_id', user.id)
        .eq('month', month)
        .maybeSingle()

      setUsed(data?.diagnosis_count ?? 0)
    } catch {
      // fallback sin bloquear la UI
    } finally {
      setLoading(false)
    }
  }, [user?.id, month])

  useEffect(() => { void fetch() }, [fetch])

  const remaining = Math.max(0, limit - used)

  return { used, limit, remaining, isAtLimit: used >= limit, loading, refetch: fetch }
}
