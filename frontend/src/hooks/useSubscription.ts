import { useAuth } from '@/contexts/AuthContext'
import { resolvePlanTier, type PlanTier } from '@/lib/plan'

export type SubscriptionState = 'active' | 'trialing' | 'expired' | 'unknown'

export interface SubscriptionInfo {
  /** Fuente unica FREE | TRIAL | PRO — usar esto para gatear funcionalidades. */
  plan: PlanTier
  state: SubscriptionState
  /** Fecha de fin del trial (null si no aplica). Para mostrar "termina el ..." */
  trialEndsAt: Date | null
  /** Dias restantes de prueba (0 si expiro o si es suscriptor) */
  trialDaysLeft: number
  /** true cuando hay que bloquear la app (trial vencido y sin suscripcion) */
  isBlocked: boolean
  /** true cuando conviene avisar que la prueba esta por vencer (<= 7 dias) */
  showTrialWarning: boolean
}

/**
 * FUENTE UNICA de estado comercial del usuario, derivado del profile
 * (fuente real: DB, via AuthContext). Ningun otro lugar de la app debe
 * recalcular FREE/TRIAL/PRO por su cuenta — importar este hook (o, en
 * codigo no-React, resolvePlanTier() de @/lib/plan directamente).
 *
 * - is_pro=true         -> 'pro', sin limites, sin trial
 * - trial_ends_at futuro -> 'trial', ACCESO EQUIVALENTE A PRO mientras dura
 * - trial_ends_at pasado -> 'free' + bloqueo duro (isBlocked)
 * - sin profile (offline / carga inicial) -> 'unknown', plan 'free' por
 *   defecto seguro, pero NUNCA bloqueamos por falta de datos todavia.
 */
export function useSubscription(): SubscriptionInfo {
  const { profile } = useAuth()
  const plan = resolvePlanTier(profile)

  if (!profile) {
    return { plan, state: 'unknown', trialEndsAt: null, trialDaysLeft: 0, isBlocked: false, showTrialWarning: false }
  }

  if (plan === 'pro') {
    return { plan, state: 'active', trialEndsAt: null, trialDaysLeft: 0, isBlocked: false, showTrialWarning: false }
  }

  const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null
  if (!trialEndsAt || isNaN(trialEndsAt.getTime())) {
    // Columna todavia no migrada: no bloquear
    return { plan, state: 'unknown', trialEndsAt: null, trialDaysLeft: 0, isBlocked: false, showTrialWarning: false }
  }

  const msLeft = trialEndsAt.getTime() - Date.now()
  if (msLeft <= 0) {
    return { plan, state: 'expired', trialEndsAt, trialDaysLeft: 0, isBlocked: true, showTrialWarning: false }
  }

  const trialDaysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000))
  return {
    plan,
    state: 'trialing',
    trialEndsAt,
    trialDaysLeft,
    isBlocked: false,
    showTrialWarning: trialDaysLeft <= 7,
  }
}
