import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
})

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'CannaTrack',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  const final = existing === 'granted'
    ? existing
    : (await Notifications.requestPermissionsAsync()).status

  if (final !== 'granted') return null

  const token = await Notifications.getExpoPushTokenAsync()
  return token.data
}

export async function scheduleDailyReminder(hour = 9, minute = 0) {
  await Notifications.cancelAllScheduledNotificationsAsync()
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'CannaTrack',
      body: 'Tenes tareas pendientes para hoy 🌿',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  })
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}
