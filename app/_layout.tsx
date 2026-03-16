import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import AsyncStorage from '@react-native-async-storage/async-storage'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  useEffect(() => {
    async function prepare() {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG)
      Purchases.configure({ apiKey: 'appl_ZhoqKqmVvCiHJPppuHtPhwyQNli' })

      const customerInfo = await Purchases.getCustomerInfo()
      const isSubscribed = typeof customerInfo.entitlements.active['premium'] !== 'undefined'
      const onboardingDone = await AsyncStorage.getItem('unlockd_onboarding_done')

      if (!onboardingDone && !isSubscribed) {
        // New user — go through onboarding
      } else if (isSubscribed) {
        // Active subscriber — mark onboarding done
        await AsyncStorage.setItem('unlockd_onboarding_done', 'true')
      }

      SplashScreen.hideAsync()
    }
    prepare()
  }, [])

  return (
    <Stack screenOptions={{ headerShown: false }} />
  )
}
