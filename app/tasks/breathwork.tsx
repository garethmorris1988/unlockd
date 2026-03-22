import React, { useEffect, useState, useRef } from 'react'
import { View, Text, TouchableOpacity, SafeAreaView, Animated } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFirstName } from '../../utils/useFirstName'

const PHASES = [
  { label: 'INHALE', duration: 4 },
  { label: 'HOLD',   duration: 7 },
  { label: 'EXHALE', duration: 8 },
]
const TOTAL_ROUNDS = 4

export default function BreathworkScreen() {
  const firstName = useFirstName()
  const [phase, setPhase]           = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(PHASES[0].duration)
  const [round, setRound]           = useState(1)
  const [isRunning, setIsRunning]   = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const scaleAnim = useRef(new Animated.Value(0.6)).current

  function runPhaseAnimation(phaseIndex: number) {
    if (phaseIndex === 0) {
      Animated.timing(scaleAnim, {
        toValue: 1.0,
        duration: 4000,
        useNativeDriver: true,
      }).start()
    } else if (phaseIndex === 1) {
      Animated.timing(scaleAnim, {
        toValue: 1.0,
        duration: 100,
        useNativeDriver: true,
      }).start()
    } else if (phaseIndex === 2) {
      Animated.timing(scaleAnim, {
        toValue: 0.6,
        duration: 8000,
        useNativeDriver: true,
      }).start()
    }
  }

  async function saveCompletion() {
    const today = new Date()
    const dateKey = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
    const storageKey = 'unlockd_completed_today_' + dateKey
    const existing = await AsyncStorage.getItem(storageKey)
    const currentList: string[] = existing ? JSON.parse(existing) : []
    if (!currentList.includes('breathwork')) currentList.push('breathwork')
    await AsyncStorage.setItem(storageKey, JSON.stringify(currentList))
  }

  useEffect(() => {
    if (!isRunning) return

    runPhaseAnimation(phase)

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          const nextPhase = (phase + 1) % 3

          if (phase === 2) {
            if (round >= TOTAL_ROUNDS) {
              clearInterval(interval)
              setIsRunning(false)
              setIsComplete(true)
              saveCompletion()
              return 0
            } else {
              setRound(r => r + 1)
              setPhase(0)
              runPhaseAnimation(0)
              return PHASES[0].duration
            }
          } else {
            setPhase(nextPhase)
            runPhaseAnimation(nextPhase)
            return PHASES[nextPhase].duration
          }
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, phase, round])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f4f0' }}>
      <View style={{ flex: 1, paddingHorizontal: 28 }}>

        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={{ paddingTop: 52, paddingBottom: 24, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 13, color: '#999' }}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#111', letterSpacing: -0.5, marginBottom: 4 }}>Breathwork</Text>
        <Text style={{ fontSize: 13, color: '#999', marginBottom: 48 }}>4-7-8 breathing · {TOTAL_ROUNDS} rounds</Text>

        {/* Animated circle */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Animated.View style={{
            width: 200, height: 200, borderRadius: 100,
            backgroundColor: '#fff',
            borderWidth: 0.5, borderColor: '#e0dfd8',
            alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: scaleAnim }],
            shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
          }}>
            {!isComplete ? (
              <>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#999', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                  {PHASES[phase].label}
                </Text>
                <Text style={{ fontSize: 52, fontWeight: '800', color: '#111', letterSpacing: -2, lineHeight: 56 }}>
                  {secondsLeft}
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#111' }}>Complete</Text>
            )}
          </Animated.View>
        </View>

        {/* Round indicator */}
        {!isComplete && (
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>Round {round} of {TOTAL_ROUNDS}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PHASES.map((p, i) => (
                <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === phase ? '#111' : '#ddd' }} />
                  <Text style={{ fontSize: 9, color: i === phase ? '#111' : '#ccc', letterSpacing: 1 }}>{p.label}</Text>
                  <Text style={{ fontSize: 9, color: i === phase ? '#111' : '#ccc' }}>{p.duration}s</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Instruction */}
        <Text style={{ fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 }}>
          {isComplete
            ? firstName
              ? `That's it, ${firstName}. You're centred.`
              : 'Your nervous system is reset.\nYou are ready.'
            : phase === 0 ? 'Breathe in slowly through your nose.'
            : phase === 1 ? 'Hold your breath gently.'
            : 'Exhale completely through your mouth.'}
        </Text>

        <View style={{ flex: 1 }} />

        {/* Button */}
        {!isComplete ? (
          <TouchableOpacity
            onPress={() => setIsRunning(!isRunning)}
            style={{ backgroundColor: '#111', borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginBottom: 32 }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
              {isRunning ? 'Pause' : round === 1 && phase === 0 && secondsLeft === PHASES[0].duration ? 'Start' : 'Resume'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ backgroundColor: '#c8f135', borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginBottom: 32 }}
          >
            <Text style={{ color: '#111', fontSize: 15, fontWeight: '700' }}>
            {firstName ? `Done, ${firstName} ✓` : 'Done ✓'}
          </Text>
          </TouchableOpacity>
        )}

      </View>
    </SafeAreaView>
  )
}
