import { useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Returns the stored first name from AsyncStorage.
 * Re-reads every time the screen comes into focus.
 */
export function useFirstName(): string {
  const [firstName, setFirstName] = useState('')
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('unlockd_first_name').then(v => {
        if (v) setFirstName(v)
      })
    }, [])
  )
  return firstName
}
