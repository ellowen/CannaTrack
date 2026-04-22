import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'

const isExpoGo = Constants.appOwnership === 'expo'

export async function registerForPushNotifications(userId?: string): Promise<string | null> {
  if (!Device.isDevice || isExpoGo) return null

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync()
    if (userId && token) {
      const { supabase } = await import('./supabase')
      void supabase.from('profiles').update({ push_token: token }).eq('id', userId)
    }
    return token
  } catch {
    return null
  }
}

export async function scheduleDailyReminder(hour = 9, minute = 0): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'CannaTrack 🌿',
      body:  'Revisa las tareas del dia para tus plantas',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  })
}
