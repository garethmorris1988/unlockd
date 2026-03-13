import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

type HabitId = 'meditation' | 'breathwork' | 'gratitude' | 'steps' | 'exercise'

const ALL_HABITS: { id: HabitId; name: string; meta: string; benefit: string }[] = [
  { id: 'meditation', name: 'Meditation', meta: '5 min timer',      benefit: "Lowers cortisol before the day's stress hits. Even 5 minutes of stillness rewires your threat response." },
  { id: 'breathwork', name: 'Breathwork', meta: '4-7-8 · 4 rounds', benefit: 'Activates your parasympathetic nervous system within 90 seconds. The fastest tool to shift your mental state.' },
  { id: 'gratitude',  name: 'Gratitude',  meta: '3 entries',         benefit: 'Primes your brain to notice positives all day. Measurably reduces anxiety within two weeks.' },
  { id: 'steps',      name: 'Steps',      meta: '2,000 steps',       benefit: 'Boosts dopamine and wakes up your body naturally. Morning movement elevates energy and focus for hours.' },
  { id: 'exercise',   name: 'Push Ups',   meta: '20 reps',           benefit: 'Raises energy and focus for hours after. Releases BDNF, the protein that sharpens memory and learning.' },
]

const STORAGE_KEY = 'unlockd_active_habits'
const LOCK_TIME_KEY = 'unlockd_lock_time'

export default function HabitsScreen() {
  const [activeHabits, setActiveHabits] = useState<HabitId[]>(
    ['meditation', 'breathwork', 'gratitude', 'steps', 'exercise']
  )
  const [lockHour, setLockHour] = useState(6)
  const [lockMin, setLockMin] = useState(0)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val) setActiveHabits(JSON.parse(val))
    })
    AsyncStorage.getItem(LOCK_TIME_KEY).then(val => {
      if (val) {
        const { hour, min } = JSON.parse(val)
        setLockHour(hour)
        setLockMin(min)
      }
    })
  }, [])

  async function toggleHabit(id: HabitId) {
    if (activeHabits.includes(id) && activeHabits.length === 1) return
    const updated = activeHabits.includes(id)
      ? activeHabits.filter(h => h !== id)
      : [...activeHabits, id]
    setActiveHabits(updated)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  function adjustHour(dir: 1 | -1) {
    const next = (lockHour + dir + 24) % 24
    setLockHour(next)
    AsyncStorage.setItem(LOCK_TIME_KEY, JSON.stringify({ hour: next, min: lockMin }))
  }

  function adjustMin(dir: 1 | -1) {
    const next = lockMin === 0 && dir === -1 ? 30 : lockMin === 30 && dir === 1 ? 0 : lockMin + dir * 30
    setLockMin(next)
    AsyncStorage.setItem(LOCK_TIME_KEY, JSON.stringify({ hour: lockHour, min: next }))
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f4f0' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}>

        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={{ paddingTop: 52, alignSelf: 'flex-start', marginBottom: 24 }}>
          <Text style={{ fontSize: 13, color: '#aaa' }}>← Back</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 4 }}>My Routine</Text>
        <Text style={{ fontSize: 13, color: '#aaa', marginBottom: 28 }}>Choose your daily habits.</Text>

        {/* Lock time section */}
        <Text style={{ fontSize: 10, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>LOCK TIME</Text>
        <View style={{ backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e0dfd8', borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>Morning Lock Time</Text>
            <Text style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Locks from this time daily</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {/* Hour */}
            <View style={{ alignItems: 'center', gap: 4 }}>
              <TouchableOpacity onPress={() => adjustHour(1)}>
                <Text style={{ fontSize: 12, color: '#ccc', paddingHorizontal: 8 }}>▲</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#111', minWidth: 34, textAlign: 'center' }}>
                {String(lockHour).padStart(2, '0')}
              </Text>
              <TouchableOpacity onPress={() => adjustHour(-1)}>
                <Text style={{ fontSize: 12, color: '#ccc', paddingHorizontal: 8 }}>▼</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 2 }}>:</Text>
            {/* Minute */}
            <View style={{ alignItems: 'center', gap: 4 }}>
              <TouchableOpacity onPress={() => adjustMin(1)}>
                <Text style={{ fontSize: 12, color: '#ccc', paddingHorizontal: 8 }}>▲</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#111', minWidth: 34, textAlign: 'center' }}>
                {String(lockMin).padStart(2, '0')}
              </Text>
              <TouchableOpacity onPress={() => adjustMin(-1)}>
                <Text style={{ fontSize: 12, color: '#ccc', paddingHorizontal: 8 }}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Habits section */}
        <Text style={{ fontSize: 10, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>YOUR HABITS</Text>
        <View style={{ gap: 8 }}>
          {ALL_HABITS.map(habit => {
            const isOn = activeHabits.includes(habit.id)
            return (
              <TouchableOpacity
                key={habit.id}
                onPress={() => toggleHabit(habit.id)}
                activeOpacity={0.7}
                style={{
                  backgroundColor: isOn ? '#111' : '#fff',
                  borderWidth: 0.5,
                  borderColor: isOn ? '#111' : '#e0dfd8',
                  borderRadius: 14,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isOn ? '#fff' : '#111', marginBottom: 3 }}>
                    {habit.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: isOn ? '#888' : '#bbb', lineHeight: 16 }}>
                    {habit.benefit}
                  </Text>
                </View>
                <View style={{ width: 36, height: 20, backgroundColor: isOn ? '#c8f135' : '#e0dfd8', borderRadius: 10 }} />
              </TouchableOpacity>
            )
          })}
        </View>

      </ScrollView>

      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          marginHorizontal: 24,
          marginBottom: 24,
          marginTop: 8,
          backgroundColor: '#111',
          borderRadius: 50,
          paddingVertical: 16,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Save & Close</Text>
      </TouchableOpacity>

    </SafeAreaView>
  )
}
