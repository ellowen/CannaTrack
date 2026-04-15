const LAST_NOTIF_KEY = 'cannatrack-last-notif-date'

/** Solicita permiso de notificaciones al usuario. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

/**
 * Muestra una notificación de tareas pendientes si:
 * - El permiso está concedido
 * - Hay tareas pendientes hoy
 * - No se mostró ya una notificación hoy
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
    (uniquePlants.length > 2 ? ` y ${uniquePlants.length - 2} más` : '')

  try {
    new Notification(title, {
      body,
      icon: '/icon.svg',
      tag: 'daily-tasks',
    })
  } catch {
    // Silenciar errores en contextos donde Notification está bloqueado
  }
}

/** Registra el service worker si el browser lo soporta. */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    // No crítico para el funcionamiento de la app
  }
}
