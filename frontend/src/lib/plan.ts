/**
 * Fuente unica de verdad para determinar el nivel de acceso del usuario.
 * Logica pura (sin React, sin Supabase) — portatil a Expo sin cambios.
 *
 * Reglas de negocio (unicas, no duplicar en ningun otro lado):
 * - is_pro = true            -> 'pro' (suscriptor real, sin limite de tiempo)
 * - trial_ends_at > ahora    -> 'trial' (acceso equivalente a Pro mientras dura)
 * - cualquier otro caso      -> 'free'
 *
 * El backend (RLS/triggers en Supabase) replica esta MISMA regla — ver
 * backend/supabase/migrations/20260808000002_trial_grants_pro_access.sql.
 * Cambiar esta funcion sin replicar el cambio en la DB rompe la paridad
 * frontend/backend que el negocio depende.
 */
export type PlanTier = 'free' | 'trial' | 'pro'

export interface PlanProfile {
  is_pro: boolean
  trial_ends_at?: string | null
}

export function resolvePlanTier(profile: PlanProfile | null | undefined): PlanTier {
  if (!profile) return 'free'
  if (profile.is_pro) return 'pro'
  if (profile.trial_ends_at) {
    const endsAt = new Date(profile.trial_ends_at)
    if (!isNaN(endsAt.getTime()) && endsAt.getTime() > Date.now()) return 'trial'
  }
  return 'free'
}

/** true si el usuario tiene acceso a funcionalidades Pro (Pro real o trial vigente). */
export function hasProAccess(tier: PlanTier): boolean {
  return tier === 'pro' || tier === 'trial'
}
