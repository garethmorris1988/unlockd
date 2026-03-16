import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_PREFIX = 'unlockd_completed_today_'

export default function StreakScreen() {
  const [currentStreak, setCurrentStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [completedDates, setCompletedDates] = useState<string[]>([])

  useEffect(() => {
    ;(async () => {
      const allKeys = await AsyncStorage.getAllKeys()
      const completionKeys = (allKeys as string[]).filter(k => k.startsWith(STORAGE_PREFIX))
      const dates = completionKeys.map(k => k.slice(STORAGE_PREFIX.length))
      setCompletedDates(dates)

      // Current streak: count backwards from today
      function dateToKey(d: Date): string {
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
      }
      function daysAgo(n: number): Date {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        d.setDate(d.getDate() - n)
        return d
      }

      const dateSet = new Set(dates)
      const todayDone = dateSet.has(dateToKey(daysAgo(0)))
      let current = 0
      let i = todayDone ? 0 : 1
      while (i <= 365) {
        if (!dateSet.has(dateToKey(daysAgo(i)))) break
        current++
        i++
      }
      setCurrentStreak(current)

      // Best streak: sort and find longest consecutive run
      const timestamps = dates
        .map(k => {
          const parts = k.split('-').map(Number)
          return new Date(parts[0], parts[1] - 1, parts[2]).getTime()
        })
        .sort((a, b) => a - b)

      let best = 0, run = 0, prev = -Infinity
      for (const ts of timestamps) {
        run = (ts - prev) === 86400000 ? run + 1 : 1
        if (run > best) best = run
        prev = ts
      }
      setBestStreak(best)
    })()
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f4f0' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>

        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={{ paddingTop: 52, paddingBottom: 8, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 13, color: '#999' }}>← Back</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#111', letterSpacing: -0.5, marginTop: 8, marginBottom: 4 }}>Your Streak</Text>
        <Text style={{ fontSize: 13, color: '#999', marginBottom: 24 }}>Don't break the chain.</Text>

        {/* Stat cards */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <View style={{ flex: 1, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e0dfd8', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 36, fontWeight: '800', color: '#111', lineHeight: 40 }}>{currentStreak}</Text>
            <Text style={{ fontSize: 9, color: '#aaa', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>CURRENT STREAK</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e0dfd8', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 36, fontWeight: '800', color: '#111', lineHeight: 40 }}>{bestStreak}</Text>
            <Text style={{ fontSize: 9, color: '#aaa', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>BEST STREAK</Text>
          </View>
        </View>

        {/* Calendar card */}
        <View style={{ backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e0dfd8', borderRadius: 16, padding: 16 }}>

          {/* Day headers */}
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: '#ccc', fontWeight: '400' }}>{d}</Text>
            ))}
          </View>

          {/* 35 day grid */}
          {(() => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const endDate = new Date(today)
            const dayOfWeek = today.getDay()
            const daysUntilSaturday = 6 - dayOfWeek
            endDate.setDate(endDate.getDate() + daysUntilSaturday)

            const startDate = new Date(endDate)
            startDate.setDate(startDate.getDate() - 34)

            const calendarDays = Array.from({ length: 35 }).map((_, i) => {
              const d = new Date(startDate)
              d.setDate(startDate.getDate() + i)
              return d
            })

            return (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {calendarDays.map((d, i) => {
                  const dateKey = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
                  const isComplete = completedDates.includes(dateKey)
                  const isToday = d.getTime() === today.getTime()
                  const isFuture = d > today

                  return (
                    <View key={i} style={{ width: '14.28%', aspectRatio: 1, padding: 2 }}>
                      <View style={{
                        flex: 1,
                        borderRadius: 4,
                        backgroundColor: isComplete ? '#111' : '#f0efea',
                        borderWidth: isToday && !isComplete ? 1.5 : 0,
                        borderColor: isToday && !isComplete ? '#999' : 'transparent',
                        opacity: isFuture ? 0.3 : 1,
                      }} />
                    </View>
                  )
                })}
              </View>
            )
          })()}

          {/* Legend */}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#111' }} />
              <Text style={{ fontSize: 9, color: '#aaa' }}>Complete</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#f0efea' }} />
              <Text style={{ fontSize: 9, color: '#aaa' }}>Missed</Text>
            </View>
          </View>

        </View>

      </ScrollView>
    </SafeAreaView>
  )
}
