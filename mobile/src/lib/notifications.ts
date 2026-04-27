import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'

const isExpoGo = Constants.appOwnership === 'expo'

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

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

export async function scheduleDailyReminder(hour = 9, minute = 0): Promise<void> {
  if (Platform.OS === 'web') return

  // Cancela todas las notificaciones diarias anteriores antes de reprogramar
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const dailyIds = scheduled
    .filter(n => n.content.data?.type === 'daily_reminder')
    .map(n => n.identifier)
  await Promise.all(dailyIds.map(id => Notifications.cancelScheduledNotificationAsync(id)))

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'CannaTrack',
      body: 'Revisa las tareas del dia para tus plantas',
      data: { type: 'daily_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  })
}

export async function schedulePlantTaskNotification(
  plantId: string,
  plantName: string,
  taskType: string,
  scheduledDate: Date,
): Promise<void> {
  if (Platform.OS === 'web') return

  const triggerDate = new Date(scheduledDate)
  triggerDate.setHours(9, 0, 0, 0)
  if (triggerDate <= new Date()) return

  const labels: Record<string, string> = {
    nutrition:   'necesita nutrientes hoy',
    irrigation:  'necesita riego hoy',
    observation: 'tiene una observacion pendiente',
    foliar:      'necesita aplicacion foliar',
    harvest:     'podria estar lista para cosechar',
  }
  const body = labels[taskType] ?? 'tiene una tarea pendiente'

  await Notifications.scheduleNotificationAsync({
    content: {
      title: plantName,
      body,
      data: { type: 'task_reminder', plantId, taskType },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  })
}

export async function cancelPlantNotifications(plantId: string): Promise<void> {
  if (Platform.OS === 'web') return

  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const toCancel = scheduled
    .filter(n => n.content.data?.plantId === plantId)
    .map(n => n.identifier)
  await Promise.all(toCancel.map(id => Notifications.cancelScheduledNotificationAsync(id)))
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return
  await Notifications.cancelAllScheduledNotificationsAsync()
}
