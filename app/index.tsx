import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

const HABIT_NAMES: Record<string, string> = {
  meditation: 'Meditation',
  breathwork: 'Breathwork',
  gratitude: 'Gratitude',
  steps: 'Steps',
  exercise: 'Push Ups',
}

export default function LockScreen() {
  const [timeString, setTimeString] = useState('00:00')
  const [dateString, setDateString] = useState('')
  const [habits, setHabits] = useState<string[]>([])

  useEffect(() => {
    const days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

    const now = new Date()
    setDateString(days[now.getDay()] + ' · ' + now.getDate() + ' ' + months[now.getMonth()])

    const interval = setInterval(() => {
      const n = new Date()
      const h = n.getHours().toString().padStart(2, '0')
      const m = n.getMinutes().toString().padStart(2, '0')
      setTimeString(h + ':' + m)
    }, 1000)

    AsyncStorage.getItem('unlockd_active_habits').then(val => {
      if (val) {
        const ids: string[] = JSON.parse(val)
        setHabits(ids.map(id => HABIT_NAMES[id] ?? id))
      } else {
        setHabits(['Meditation', 'Breathwork', 'Gratitude', 'Steps', 'Push Ups'])
      }
    })

    return () => clearInterval(interval)
  }, [])

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#f5f4f0' }}>
      <View style={{ flex:1, paddingHorizontal:28 }}>

        {/* TOP CLOCK BLOCK */}
        <View style={{ paddingTop:60 }}>

          <Text style={{ color:'#999', fontSize:11, fontWeight:'400', letterSpacing:3, textTransform:'uppercase', marginBottom:8 }}>
            {dateString}
          </Text>

          <Text style={{ color:'#111', fontSize:80, fontWeight:'800', letterSpacing:-4, lineHeight:80 }}>
            {timeString}
          </Text>

          <Text style={{ color:'#111', fontSize:11, fontWeight:'700', letterSpacing:3, textTransform:'uppercase', marginTop:10 }}>
            YOUR ROUTINE UNLOCKD
          </Text>

        </View>

        {/* SPACER */}
        <View style={{ flex:1 }} />

        {/* BOTTOM CARD */}
        <View style={{ backgroundColor:'#fff', borderWidth:0.5, borderColor:'#e0dfd8', borderRadius:20, padding:22, marginBottom:12 }}>

          <Text style={{ color:'#111', fontSize:15, fontWeight:'800', marginBottom:3 }}>
            Phone is locked
          </Text>
          <Text style={{ color:'#999', fontSize:12, fontWeight:'400', marginBottom:18 }}>
            Complete your routine to unlock
          </Text>

          {habits.map((habit, i) => (
            <View key={i} style={{ flexDirection:'row', alignItems:'center', marginBottom:10 }}>
              <View style={{ width:6, height:6, borderRadius:3, backgroundColor:'#c8f135', marginRight:12 }} />
              <Text style={{ color:'#111', fontSize:13, fontWeight:'400' }}>{habit}</Text>
            </View>
          ))}

          <TouchableOpacity
            onPress={() => router.push('/motivation')}
            style={{ backgroundColor:'#111', borderRadius:50, paddingVertical:15, alignItems:'center', marginTop:18 }}
          >
            <Text style={{ color:'#fff', fontSize:15, fontWeight:'700' }}>Start Your Morning →</Text>
          </TouchableOpacity>

        </View>

        {/* DEV RESET */}
        <TouchableOpacity
          onPress={async () => {
            await AsyncStorage.multiRemove(['unlockd_onboarding_done','unlockd_active_habits','unlockd_lock_time'])
            router.replace('/onboarding')
          }}
          style={{ paddingBottom:16, alignItems:'center' }}
        >
          <Text style={{ color:'#ccc', fontSize:11 }}>↺ Reset (dev only)</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  )
}
