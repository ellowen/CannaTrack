import { supabase } from '@/lib/auth'

// REEMPLAZAR con la VAPID public key generada por:
//   cd backend && npx web-push generate-vapid-keys
// Luego: supabase secrets set VAPID_PUBLIC_KEY=<key> VAPID_PRIVATE_KEY=<key>
const VAPID_PUBLIC_KEY = 'REPLACE_WITH_VAPID_PUBLIC_KEY'

const LAST_NOTIF_KEY = 'cannatrack-last-notif-date'

/** Convierte una VAPID public key base64url a Uint8Array para PushManager. */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buf = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) buf[i] = rawData.charCodeAt(i)
  return buf.buffer
}

/** Solicita permiso de notificaciones al usuario. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

/**
 * Suscribe al usuario a Web Push via VAPID y guarda la suscripcion en Supabase.
 * Retorna true si la suscripcion se creo correctamente.
 */
export async function subscribeToPush(userId: string, reminderHour: number): Promise<boolean> {
  if (VAPID_PUBLIC_KEY === 'REPLACE_WITH_VAPID_PUBLIC_KEY') return false
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    const json = sub.toJSON() as {
      endpoint: string
      keys: { p256dh: string; auth: string }
    }
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        reminder_hour: reminderHour,
      },
      { onConflict: 'user_id,endpoint' }
    )
    return !error
  } catch {
    return false
  }
}

/**
 * Cancela la suscripcion Web Push del usuario y la elimina de Supabase.
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
  } catch {
    // silencioso — no critico
  }
}

/**
 * Actualiza la hora del recordatorio en Supabase para la suscripcion activa.
 */
export async function updatePushReminderHour(userId: string, hour: number): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    await supabase
      .from('push_subscriptions')
      .update({ reminder_hour: hour })
      .eq('user_id', userId)
      .eq('endpoint', sub.endpoint)
  } catch {
    // silencioso
  }
}

/**
 * Devuelve true si la hora actual esta dentro de la ventana del recordatorio.
 */
export function isWithinReminderWindow(reminderHour: number): boolean {
  return new Date().getHours() === reminderHour
}

/**
 * Muestra una notificacion de tareas pendientes si el permiso esta concedido,
 * hay tareas pendientes hoy, y la hora esta en la ventana configurada.
 */
export function notifyPendingTasks(
  pendingCount: number,
  plantNames: string[],
  reminderHour?: number,
): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (pendingCount === 0) return

  if (reminderHour !== undefined && !isWithinReminderWindow(reminderHour)) return

  const today = new Date().toDateString()
  if (localStorage.getItem(LAST_NOTIF_KEY) === today) return
  localStorage.setItem(LAST_NOTIF_KEY, today)

  const title = `🌿 ${pendingCount} tarea${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''} hoy`
  const uniquePlants = [...new Set(plantNames)]
  const body = uniquePlants.slice(0, 2).join(', ') +
    (uniquePlants.length > 2 ? ` y ${uniquePlants.length - 2} mas` : '')

  const options: NotificationOptions = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-180.png',
    tag: 'daily-tasks',
  }

  try {
    // iOS PWA requiere showNotification via SW — new Notification() no funciona
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          reg.showNotification(title, options)
        } else {
          new Notification(title, options)
        }
      }).catch(() => {
        try { new Notification(title, options) } catch { /* silencioso */ }
      })
    } else {
      new Notification(title, options)
    }
  } catch {
    // silencioso
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
