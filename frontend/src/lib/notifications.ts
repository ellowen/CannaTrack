const LAST_NOTIF_KEY = 'cannatrack-last-notif-date'

/** Solicita permiso de notificaciones al usuario. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

/**
 * Devuelve true si la hora actual esta dentro de la ventana del recordatorio.
 * La ventana es de 1 hora a partir de reminderHour (ej: 9 = entre 9:00 y 9:59).
 */
export function isWithinReminderWindow(reminderHour: number): boolean {
  return new Date().getHours() === reminderHour
}

/**
 * Muestra una notificacion de tareas pendientes si:
 * - El permiso esta concedido
 * - Hay tareas pendientes hoy
 * - La hora actual esta en la ventana del recordatorio configurado
 * - No se mostro ya una notificacion hoy
 */
export function notifyPendingTasks(
  pendingCount: number,
  plantNames: string[],
  reminderHour?: number,
): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (pendingCount === 0) return

  // Si se pasa una hora, solo notificar en esa ventana
  if (reminderHour !== undefined && !isWithinReminderWindow(reminderHour)) return

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
      icon: '/icon-192.png',
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
    // No crítico para el funcionamiento de la app
  }
}
