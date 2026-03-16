import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  return finalStatus === 'granted'
}

export async function scheduleMorningReminder(hour: number, min: number): Promise<void> {
  // Cancel any existing scheduled notifications first
  await Notifications.cancelAllScheduledNotificationsAsync()

  const granted = await requestNotificationPermissions()
  if (!granted) return

  // Schedule daily notification at the user's lock time minus 30 minutes
  let reminderHour = hour
  let reminderMin = min - 30
  if (reminderMin < 0) {
    reminderMin += 60
    reminderHour -= 1
    if (reminderHour < 0) reminderHour = 23
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to unlock your morning.',
      body: 'Your routine is waiting. Complete it before your phone locks.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: reminderHour,
      minute: reminderMin,
    },
  })
}

export async function scheduleFromStoredLockTime(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem('unlockd_lock_time')
    if (stored) {
      const { hour, min } = JSON.parse(stored)
      await scheduleMorningReminder(hour, min)
    }
  } catch (e) {
    console.log('Notification scheduling error:', e)
  }
}
