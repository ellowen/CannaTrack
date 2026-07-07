import { supabase } from '@/lib/auth'

const LAST_NOTIF_KEY = 'cultitrack-last-notif-date'

/**
 * VAPID public key para Web Push.
 * REEMPLAZAR con la clave publica generada por:
 *   cd backend && npx web-push generate-vapid-keys
 * La clave privada va en Supabase secrets (NO en git):
 *   supabase secrets set VAPID_PRIVATE_KEY=<private-key>
 *   supabase secrets set VAPID_PUBLIC_KEY=<public-key>
 *   supabase secrets set VAPID_EMAIL=mailto:lucazrubio@gmail.com
 */
export const VAPID_PUBLIC_KEY = 'REPLACE_WITH_VAPID_PUBLIC_KEY'

/** Convierte una clave VAPID base64url a ArrayBuffer (requerido por pushManager.subscribe). */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buf = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i)
  return buf
}

/** Solicita permiso de notificaciones al usuario. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

/**
 * Suscribe al usuario a Web Push y guarda la suscripcion en Supabase.
 * Requiere que el SW este registrado y que el permiso este concedido.
 */
export async function subscribeToPush(userId: string, reminderHour: number): Promise<void> {
  if (!('PushManager' in window)) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  const json = subscription.toJSON()
  const endpoint = json.endpoint!
  const p256dh = json.keys?.p256dh ?? ''
  const auth = json.keys?.auth ?? ''

  await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint, p256dh, auth, reminder_hour: reminderHour },
    { onConflict: 'user_id,endpoint' }
  )
}

/**
 * Cancela la suscripcion Web Push y la elimina de Supabase.
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!('PushManager' in window)) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
}

/**
 * Actualiza la hora de recordatorio para todas las suscripciones activas del usuario.
 */
export async function updateReminderHour(userId: string, reminderHour: number): Promise<void> {
  if (!('PushManager' in window)) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  await supabase
    .from('push_subscriptions')
    .update({ reminder_hour: reminderHour })
    .eq('user_id', userId)
    .eq('endpoint', subscription.endpoint)
}

/**
 * Muestra una notificacion de tareas pendientes si:
 * - El permiso esta concedido
 * - Hay tareas pendientes hoy
 * - No se mostro ya una notificacion hoy
 */
export function notifyPendingTasks(pendingCount: number, plantNames: string[]): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (pendingCount === 0) return

  const today = new Date().toDateString()
  if (localStorage.getItem(LAST_NOTIF_KEY) === today) return
  localStorage.setItem(LAST_NOTIF_KEY, today)

  const title = `🌿 ${pendingCount} tarea${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''} hoy`
  const uniquePlants = [...new Set(plantNames)]
  const body = uniquePlants.slice(0, 2).join(', ') +
    (uniquePlants.length > 2 ? ` y ${uniquePlants.length - 2} mas` : '')

  try {
    new Notification(title, {
      body,
      icon: '/icon.svg',
      tag: 'daily-tasks',
    })
  } catch {
    // Silenciar errores en contextos donde Notification esta bloqueado
  }
}

/** Registra el service worker si el browser lo soporta. */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    // No critico para el funcionamiento de la app
  }
}
