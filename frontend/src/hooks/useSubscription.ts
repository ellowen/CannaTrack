import { useAuth } from '@/contexts/AuthContext'

export type SubscriptionState = 'active' | 'trialing' | 'expired' | 'unknown'

export interface SubscriptionInfo {
  state: SubscriptionState
  /** Dias restantes de prueba (0 si expiro o si es suscriptor) */
  trialDaysLeft: number
  /** true cuando hay que bloquear la app (trial vencido y sin suscripcion) */
  isBlocked: boolean
  /** true cuando conviene avisar que la prueba esta por vencer (<= 7 dias) */
  showTrialWarning: boolean
}

/**
 * Estado comercial del usuario, derivado del profile (fuente: DB).
 *
 * - is_pro=true  -> suscriptor activo, sin limites de trial
 * - trial vigente -> 'trialing' con dias restantes
 * - trial vencido -> 'expired' (la app se bloquea)
 * - sin profile (offline / migracion no aplicada) -> 'unknown': NUNCA
 *   bloqueamos por falta de datos — offline-first y rollout seguro.
 */
export function useSubscription(): SubscriptionInfo {
  const { profile } = useAuth()

  if (!profile) {
    return { state: 'unknown', trialDaysLeft: 0, isBlocked: false, showTrialWarning: false }
  }

  if (profile.is_pro) {
    return { state: 'active', trialDaysLeft: 0, isBlocked: false, showTrialWarning: false }
  }

  const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null
  if (!trialEndsAt || isNaN(trialEndsAt.getTime())) {
    // Columna todavia no migrada: no bloquear
    return { state: 'unknown', trialDaysLeft: 0, isBlocked: false, showTrialWarning: false }
  }

  const msLeft = trialEndsAt.getTime() - Date.now()
  if (msLeft <= 0) {
    return { state: 'expired', trialDaysLeft: 0, isBlocked: true, showTrialWarning: false }
  }

  const trialDaysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000))
  return {
    state: 'trialing',
    trialDaysLeft,
    isBlocked: false,
    showTrialWarning: trialDaysLeft <= 7,
  }
}
