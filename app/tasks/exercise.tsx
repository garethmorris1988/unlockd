import React, { useState } from 'react'
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

const EXERCISES = [
  { id: 'pushups', label: 'Push Ups', target: 20 },
  { id: 'squats',  label: 'Squats',   target: 20 },
  { id: 'situps',  label: 'Sit Ups',  target: 20 },
]

export default function ExerciseScreen() {
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0])
  const [count, setCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  async function handleComplete() {
    const today = new Date()
    const dateKey = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
    const storageKey = 'unlockd_completed_today_' + dateKey
    const existing = await AsyncStorage.getItem(storageKey)
    const currentList: string[] = existing ? JSON.parse(existing) : []
    if (!currentList.includes('exercise')) currentList.push('exercise')
    await AsyncStorage.setItem(storageKey, JSON.stringify(currentList))
    setIsComplete(true)
  }

  const progress = Math.min(count / selectedExercise.target, 1)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f4f0' }}>
      <View style={{ flex: 1, paddingHorizontal: 28 }}>

        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={{ paddingTop: 52, paddingBottom: 24, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 13, color: '#999' }}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#111', letterSpacing: -0.5, marginBottom: 4 }}>Exercise</Text>
        <Text style={{ fontSize: 13, color: '#999', marginBottom: 24 }}>Complete your reps to unlock this habit.</Text>

        {/* Exercise selector */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 40 }}>
          {EXERCISES.map(ex => (
            <TouchableOpacity
              key={ex.id}
              onPress={() => { setSelectedExercise(ex); setCount(0); setIsComplete(false) }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 50,
                alignItems: 'center',
                backgroundColor: selectedExercise.id === ex.id ? '#111' : '#fff',
                borderWidth: 0.5,
                borderColor: selectedExercise.id === ex.id ? '#111' : '#e0dfd8',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: selectedExercise.id === ex.id ? '#fff' : '#999' }}>
                {ex.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Count display */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View style={{
            width: 200, height: 200, borderRadius: 100,
            backgroundColor: '#fff',
            borderWidth: 0.5, borderColor: '#e0dfd8',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 64, fontWeight: '800', color: '#111', letterSpacing: -3, lineHeight: 68 }}>
              {count}
            </Text>
            <Text style={{ fontSize: 10, color: '#bbb', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
              OF {selectedExercise.target} REPS
            </Text>
          </View>

          {/* Progress bar */}
          <View style={{ marginTop: 16, width: 200, height: 4, backgroundColor: '#e0dfd8', borderRadius: 2 }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: isComplete ? '#c8f135' : '#111', width: progress * 200 }} />
          </View>
        </View>

        {/* Rep buttons */}
        {!isComplete && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 40 }}>
            <TouchableOpacity
              onPress={() => setCount(c => Math.max(0, c - 1))}
              style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e0dfd8', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 24, color: '#111', fontWeight: '300' }}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const next = count + 1
                setCount(next)
                if (next >= selectedExercise.target) handleComplete()
              }}
              style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 24, color: '#fff', fontWeight: '300' }}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Instruction */}
        <Text style={{ fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 }}>
          {isComplete
            ? 'Well done. Your body is awake.'
            : 'Tap + for each rep you complete.\nAI rep counting coming in Pro.'}
        </Text>

        <View style={{ flex: 1 }} />

        {/* Button */}
        {isComplete ? (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ backgroundColor: '#c8f135', borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginBottom: 32 }}
          >
            <Text style={{ color: '#111', fontSize: 15, fontWeight: '700' }}>Done ✓</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e0dfd8', borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginBottom: 32 }}
          >
            <Text style={{ color: '#999', fontSize: 15, fontWeight: '400' }}>Skip for now</Text>
          </TouchableOpacity>
        )}

      </View>
    </SafeAreaView>
  )
}
