import { supabase } from '@/lib/auth'

/** Lista cerrada: la misma que el CHECK de analytics_events (migracion 20261028000002). */
export type AnalyticsEvent =
  | 'landing_view'
  | 'landing_cta'
  | 'demo_used'
  | 'signup_completed'
  | 'onboarding_completed'
  | 'plant_created'
  | 'task_completed'
  | 'data_exported'

let memoSession: string | undefined

/** Id aleatorio por pestana (sessionStorage): no identifica a nadie ni sobrevive al cierre. */
function sessionId(): string {
  if (memoSession) return memoSession
  try {
    const saved = sessionStorage.getItem('cultitrack-session')
    if (saved) return (memoSession = saved)
    const fresh = crypto.randomUUID()
    sessionStorage.setItem('cultitrack-session', fresh)
    return (memoSession = fresh)
  } catch {
    return (memoSession = crypto.randomUUID())
  }
}

/** No se mide con automatizacion (E2E), con "No rastrear" / Global Privacy Control ni en los tests unitarios. */
function disabled(): boolean {
  if (typeof navigator === 'undefined' || import.meta.env.MODE === 'test') return true
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  return nav.webdriver === true || nav.doNotTrack === '1' || nav.globalPrivacyControl === true
}

/**
 * Registra un evento de uso anonimo (sin cookies, sin email ni user_id).
 * Fire-and-forget: nunca tira ni bloquea la UI, y si falla se descarta.
 */
export function track(name: AnalyticsEvent, props: Record<string, string | number | boolean> = {}): void {
  if (disabled()) return
  const lang = document.documentElement.lang
  void supabase
    .from('analytics_events')
    .insert({
      session_id: sessionId(),
      name,
      path: location.pathname,
      host: location.hostname,
      lang: lang === 'es' || lang === 'en' ? lang : null,
      props,
    })
    .then(() => undefined, () => undefined)
}
