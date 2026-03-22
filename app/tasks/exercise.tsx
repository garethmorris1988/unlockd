import React, { useState } from 'react'
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native'
import { router } from 'expo-router'

const EXERCISES = [
  { id: 'pushups', label: 'Push Ups' },
  { id: 'squats',  label: 'Squats'   },
  { id: 'situps',  label: 'Sit Ups'  },
]

const GOALS = [
  { value: 1, label: '1 exercise' },
  { value: 2, label: '2 of 3'     },
  { value: 3, label: 'All 3'      },
]

export default function ExerciseSelectScreen() {
  const [selectedExercise, setSelectedExercise] = useState('pushups')
  const [goal, setGoal] = useState(1)

  const exLabel = EXERCISES.find(e => e.id === selectedExercise)?.label ?? ''

  const description =
    goal === 1 ? `Complete 20 reps of ${exLabel}.`
    : goal === 2 ? 'Complete 20 reps each of any 2 exercises.'
    : 'Complete 20 reps each of all 3 exercises.'

  function handleStart() {
    router.push(`/tasks/exercise-counter?exercise=${selectedExercise}&goal=${goal}` as any)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f4f0' }}>
      <View style={{ flex: 1, paddingHorizontal: 28 }}>

        {/* Back */}
        <TouchableOpacity onPress={() => router.back()}
          style={{ paddingTop: 52, paddingBottom: 24, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 13, color: '#999' }}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#111', letterSpacing: -0.5, marginBottom: 4 }}>
          Exercise
        </Text>
        <Text style={{ fontSize: 13, color: '#999', marginBottom: 40 }}>
          Set up your morning exercise.
        </Text>

        {/* Exercise selector */}
        <Text style={{ fontSize: 10, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
          EXERCISE
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 40 }}>
          {EXERCISES.map(ex => (
            <TouchableOpacity
              key={ex.id}
              onPress={() => setSelectedExercise(ex.id)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 50,
                alignItems: 'center',
                backgroundColor: selectedExercise === ex.id ? '#111' : '#fff',
                borderWidth: 0.5,
                borderColor: selectedExercise === ex.id ? '#111' : '#e0dfd8',
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: '600',
                color: selectedExercise === ex.id ? '#fff' : '#999',
              }}>
                {ex.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Goal selector */}
        <Text style={{ fontSize: 10, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
          GOAL
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 40 }}>
          {GOALS.map(g => (
            <TouchableOpacity
              key={g.value}
              onPress={() => setGoal(g.value)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 50,
                alignItems: 'center',
                backgroundColor: goal === g.value ? '#111' : '#fff',
                borderWidth: 0.5,
                borderColor: goal === g.value ? '#111' : '#e0dfd8',
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: '600',
                color: goal === g.value ? '#fff' : '#999',
              }}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={{ fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 }}>
          {description}
        </Text>

        <View style={{ flex: 1 }} />

        {/* Start button */}
        <TouchableOpacity
          onPress={handleStart}
          style={{
            backgroundColor: '#111',
            borderRadius: 50,
            paddingVertical: 16,
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Start</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  )
}
