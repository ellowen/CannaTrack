import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { isSameDay, addDays, startOfDay } from 'date-fns'
import type { Plant, ScheduledTask } from '@shared/types/plant'

const isExpoGo = Constants.appOwnership === 'expo'

// Horizonte de programacion: 14 dias desde hoy
const NOTIFICATION_HORIZON_DAYS = 14

// Etiquetas de tipo de tarea para el cuerpo de la notificacion
const TASK_LABELS: Record<string, string> = {
  nutrition:   'nutricion',
  irrigation:  'riego',
  observation: 'observacion',
  foliar:      'foliar',
  harvest:     'cosecha',
}

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge:  true,
      shouldShowBanner: true,
      shouldShowList:   true,
    }),
  })
}

// ─── Permisos ─────────────────────────────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null
  if (!Device.isDevice || isExpoGo) return null

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null

  try {
    const { data } = await Notifications.getExpoPushTokenAsync()
    return data
  } catch {
    return null
  }
}

// ─── Recordatorio diario ──────────────────────────────────────────────────────

export async function scheduleDailyReminder(hour = 9, minute = 0): Promise<void> {
  if (Platform.OS === 'web') return

  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const dailyIds  = scheduled
    .filter(n => n.content.data?.type === 'daily_reminder')
    .map(n => n.identifier)
  await Promise.all(dailyIds.map(id => Notifications.cancelScheduledNotificationAsync(id)))

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌿 CannaTrack',
      body:  'Revisa las tareas del dia para tus plantas',
      data:  { type: 'daily_reminder' },
    },
    trigger: {
      type:   Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  })
}

// ─── Notificaciones por planta/dia ────────────────────────────────────────────

/**
 * Agrupa las tareas pendientes de una planta por dia y agenda una
 * notificacion por dia (maximo NOTIFICATION_HORIZON_DAYS dias).
 *
 * Una notificacion por planta por dia = uso eficiente del cupo de 64
 * notificaciones locales de iOS/Android.
 */
export async function scheduleTaskNotificationsForPlant(
  plant:  Plant,
  tasks:  ScheduledTask[],
  hour  = 9,
  minute = 0,
): Promise<void> {
  if (Platform.OS === 'web') return

  // Cancelar notificaciones anteriores de esta planta
  await cancelPlantNotifications(plant.id)

  const now     = new Date()
  const today   = startOfDay(now)
  const horizon = addDays(today, NOTIFICATION_HORIZON_DAYS)

  // Filtrar tareas pendientes dentro del horizonte
  const pending = tasks.filter(t => {
    if (t.completed) return false
    const d = startOfDay(t.scheduledDate instanceof Date ? t.scheduledDate : new Date(t.scheduledDate))
    return d >= today && d <= horizon
  })

  // Agrupar por dia
  const byDay = new Map<string, ScheduledTask[]>()
  for (const task of pending) {
    const d   = startOfDay(task.scheduledDate instanceof Date ? task.scheduledDate : new Date(task.scheduledDate))
    const key = d.toISOString()
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(task)
  }

  // Agendar una notificacion por dia
  for (const [dayKey, dayTasks] of byDay.entries()) {
    const dayDate = new Date(dayKey)
    const trigger = new Date(dayDate)
    trigger.setHours(hour, minute, 0, 0)

    // Si el horario de hoy ya paso, saltar (el recordatorio diario lo cubre)
    if (trigger <= now) continue

    const taskLabels = [...new Set(dayTasks.map(t => TASK_LABELS[t.type] ?? t.type))]
    const isToday    = isSameDay(dayDate, now)

    const title = isToday
      ? `🌿 ${plant.name} — hoy`
      : `🌿 ${plant.name}`

    const body = taskLabels.length === 1
      ? `Tenes ${taskLabels[0]} pendiente`
      : `Tenes ${taskLabels.length} tareas: ${taskLabels.join(', ')}`

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type:    'task_reminder',
          plantId: plant.id,
          day:     dayKey,
          count:   dayTasks.length,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    })
  }
}

/**
 * Reprograma las notificaciones de todas las plantas.
 * Llamar despues de login, creacion/edicion de planta, o cambio de hora.
 */
export async function scheduleAllTaskNotifications(
  plants: Plant[],
  tasks:  ScheduledTask[],
  hour   = 9,
  minute = 0,
): Promise<void> {
  if (Platform.OS === 'web') return

  for (const plant of plants) {
    const plantTasks = tasks.filter(t => t.plantId === plant.id)
    await scheduleTaskNotificationsForPlant(plant, plantTasks, hour, minute)
  }
}

// ─── Notificacion individual (compatibilidad) ─────────────────────────────────

/** @deprecated Usar scheduleTaskNotificationsForPlant en su lugar */
export async function schedulePlantTaskNotification(
  plantId:       string,
  plantName:     string,
  taskType:      string,
  scheduledDate: Date,
): Promise<void> {
  if (Platform.OS === 'web') return

  const triggerDate = new Date(scheduledDate)
  triggerDate.setHours(9, 0, 0, 0)
  if (triggerDate <= new Date()) return

  const body = `${TASK_LABELS[taskType] ?? 'tarea'} pendiente`

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🌿 ${plantName}`,
      body,
      data:  { type: 'task_reminder', plantId, taskType },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  })
}

// ─── Cancelacion ──────────────────────────────────────────────────────────────

export async function cancelPlantNotifications(plantId: string): Promise<void> {
  if (Platform.OS === 'web') return

  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const toCancel  = scheduled
    .filter(n => n.content.data?.plantId === plantId)
    .map(n => n.identifier)
  await Promise.all(toCancel.map(id => Notifications.cancelScheduledNotificationAsync(id)))
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return
  await Notifications.cancelAllScheduledNotificationsAsync()
}
