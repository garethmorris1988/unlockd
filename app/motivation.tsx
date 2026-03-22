import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFirstName } from '../utils/useFirstName'

const STORAGE_PREFIX = 'unlockd_completed_today_'

const QUOTES = [
  { quote: 'We are what we repeatedly do. Excellence is not an act, but a habit.', author: 'Aristotle' },
  { quote: 'A year from now you will wish you had started today.', author: 'Karen Lamb' },
  { quote: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { quote: 'Small daily improvements over time lead to stunning results.', author: 'Robin Sharma' },
  { quote: 'Motivation gets you going. Discipline keeps you going.', author: 'Jim Ryun' },
  { quote: 'The first hour of the morning is the rudder of the day.', author: 'Henry Ward Beecher' },
  { quote: 'You will never always be motivated. You must learn to be disciplined.', author: 'Unknown' },
]

const INSIGHTS = [
  { habit: 'Meditation', benefit: "Lowers cortisol before the day's stress hits. Even 5 minutes of stillness rewires your threat response and sets a calm baseline for everything that follows." },
  { habit: 'Breathwork', benefit: 'Activates your parasympathetic nervous system within 90 seconds. Controlled breathing is the fastest tool you have to shift your mental state.' },
  { habit: 'Gratitude', benefit: 'Primes your brain to notice positives all day. Writing three things you are grateful for measurably reduces anxiety and improves mood within two weeks.' },
  { habit: 'Steps', benefit: 'Boosts dopamine and wakes up your body naturally. Morning movement — even a short walk — elevates energy and focus for hours afterward.' },
  { habit: 'Exercise', benefit: 'Raises energy and focus for hours after. A brief morning session releases BDNF, the protein that sharpens memory and accelerates learning.' },
]

export default function MotivationScreen() {
  const today = new Date()
  const quote = QUOTES[today.getDate() % QUOTES.length]
  const insight = INSIGHTS[today.getDay() % INSIGHTS.length]

  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const dateString = days[today.getDay()] + ' · ' + today.getDate() + ' ' + months[today.getMonth()]

  const firstName = useFirstName()
  const [streak, setStreak] = useState(0)

  // Re-read streak every time this screen comes into focus (e.g. after completing routine)
  useFocusEffect(
    useCallback(() => {
      ;(async () => {
        const allKeys = await AsyncStorage.getAllKeys()
        const completionKeys = (allKeys as string[]).filter(k => k.startsWith(STORAGE_PREFIX))
        const pairs = await AsyncStorage.multiGet(completionKeys)

        const completedSet = new Set<string>()
        for (const [key] of pairs) {
          completedSet.add(key.slice(STORAGE_PREFIX.length))
        }

        // Use getMonth()+1 to match the 1-indexed keys written by routine.tsx
        function dateToKey(d: Date): string {
          return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
        }
        function daysAgo(n: number): Date {
          const d = new Date()
          d.setHours(0, 0, 0, 0)
          d.setDate(d.getDate() - n)
          return d
        }

        const todayDone = completedSet.has(dateToKey(daysAgo(0)))
        let count = 0
        let i = todayDone ? 0 : 1
        while (i <= 365) {
          if (!completedSet.has(dateToKey(daysAgo(i)))) break
          count++
          i++
        }
        setStreak(count)
      })()
    }, [])
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f4f0' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 }}>

        {/* Date row + subtle reset link */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ color: '#999', fontSize: 11, fontWeight: '400', letterSpacing: 3, textTransform: 'uppercase' }}>
            {dateString}
          </Text>
          <TouchableOpacity
            onPress={async () => {
              await AsyncStorage.multiRemove(['unlockd_onboarding_done', 'unlockd_active_habits', 'unlockd_lock_time', 'unlockd_first_name', 'unlockd_last_name', 'unlockd_email'])
              router.replace('/onboarding')
            }}
          >
            <Text style={{ color: '#ccc', fontSize: 11 }}>↺ Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Personalised greeting */}
        {firstName.length > 0 && (
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#111', letterSpacing: -0.5, marginBottom: 20 }}>
            Morning, {firstName}.
          </Text>
        )}

        {/* Streak pill */}
        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e0dfd8', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 40 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: streak > 0 ? '#c8f135' : '#ccc' }} />
          {streak > 0 ? (
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#111' }}>{streak} DAY STREAK <Text style={{ fontWeight: '400', color: '#999' }}>· keep it going</Text></Text>
          ) : (
            <Text style={{ fontSize: 11, fontWeight: '400', color: '#999' }}>DAY 1 · start your streak</Text>
          )}
        </View>

        {/* Quote */}
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#111', lineHeight: 34, letterSpacing: -0.5, marginBottom: 10 }}>
          "{quote.quote}"
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '400', color: '#999', marginBottom: 36 }}>
          — {quote.author}
        </Text>

        {/* Insight card */}
        <View style={{ backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e0dfd8', borderRadius: 16, padding: 20, marginBottom: 40 }}>
          <Text style={{ fontSize: 9, fontWeight: '400', color: '#bbb', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            TODAY'S FOCUS
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 8 }}>
            {insight.habit}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '400', color: '#999', lineHeight: 20 }}>
            {insight.benefit}
          </Text>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* CTA */}
        <TouchableOpacity
          onPress={() => router.push('/routine')}
          style={{ backgroundColor: '#111', borderRadius: 50, paddingVertical: 16, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Start My Routine →</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}
