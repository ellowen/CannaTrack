/**
 * Analytics via PostHog.
 * Feature flags y eventos de producto.
 * No-op si EXPO_PUBLIC_POSTHOG_KEY no esta configurada.
 */
import PostHog from 'posthog-react-native'

const API_KEY  = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? ''
const API_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

let ph: PostHog | null = null

export function initAnalytics(): void {
  if (!API_KEY) return
  ph = new PostHog(API_KEY, {
    host:            API_HOST,
    captureAppLifecycleEvents: true,
    flushAt:         20,
    flushInterval:   30000,
  })
}

export function identifyAnalytics(userId: string, props?: Record<string, unknown>): void {
  ph?.identify(userId, props)
}

export function resetAnalytics(): void {
  ph?.reset()
}

/** Captura un evento de producto. No lanza si PostHog no esta init. */
export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  ph?.capture(event, props)
}

// ─── Catalogo de eventos ──────────────────────────────────────────────────────

export type AnalyticsEvent =
  // Autenticacion
  | 'sign_up'
  | 'sign_in'
  | 'sign_out'
  // Onboarding
  | 'onboarding_completed'
  // Plantas
  | 'plant_created'
  | 'plant_edited'
  | 'plant_deleted'
  | 'flora_phase_started'
  // Tareas
  | 'task_completed'
  | 'task_uncompleted'
  // Diario
  | 'diary_entry_created'
  | 'diary_photo_added'
  // Diagnostico IA
  | 'diagnosis_started'
  | 'diagnosis_completed'
  | 'diagnosis_error'
  // Export
  | 'export_started'
  | 'export_completed'
  | 'export_error'
  // Paywall
  | 'paywall_shown'
  | 'paywall_purchase_started'
  | 'paywall_purchase_completed'
  | 'paywall_purchase_error'
  | 'paywall_restore_started'
  | 'paywall_restore_completed'
  // Tablas nutricionales
  | 'nutrition_table_viewed'
  | 'nutrition_table_selected'
  // Configuracion
  | 'settings_opened'
  | 'notification_toggled'
