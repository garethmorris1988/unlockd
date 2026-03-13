import React, { useEffect, useState, useRef } from 'react'
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Audio } from 'expo-av'
import Svg, { Circle } from 'react-native-svg'

const TOTAL_SECONDS = 300
const CIRCLE_SIZE = 220
const STROKE_WIDTH = 4
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function MeditationScreen() {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS)
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)

  async function playTone(type: 'minute' | 'complete') {
    try {
      const { sound } = await Audio.Sound.createAsync(
        type === 'complete'
          ? { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' }
          : { uri: 'https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3' },
        { shouldPlay: true }
      )
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) sound.unloadAsync()
      })
    } catch (e) {
      console.log('Audio error:', e)
    }
  }

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true })
  }, [])

  useEffect(() => {
    if (isRunning) {
      interval.current = setInterval(() => {
        setSecondsLeft(s => {
          const next = s - 1
          if (next > 0 && next % 60 === 0) {
            playTone('minute')
          }
          if (next <= 0) {
            clearInterval(interval.current!)
            setIsComplete(true)
            setIsRunning(false)
            playTone('complete')
            const today = new Date()
            const dateKey = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
            AsyncStorage.setItem('unlockd_completed_today_' + dateKey, JSON.stringify(['meditation']))
            return 0
          }
          return next
        })
      }, 1000)
    } else {
      if (interval.current) clearInterval(interval.current)
    }
    return () => {
      if (interval.current) clearInterval(interval.current)
    }
  }, [isRunning])

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const strokeDashoffset = CIRCUMFERENCE * (secondsLeft / TOTAL_SECONDS)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f4f0' }}>
      <View style={{ flex: 1, paddingHorizontal: 28 }}>

        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={{ paddingTop: 52, paddingBottom: 24, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 13, color: '#999' }}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#111', letterSpacing: -0.5, marginBottom: 4 }}>Meditation</Text>
        <Text style={{ fontSize: 13, color: '#999', marginBottom: 48 }}>Find stillness before your day begins.</Text>

        {/* Timer with SVG ring */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <View style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
            <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* Background track */}
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke="#e0dfd8"
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              {/* Progress arc */}
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke={isComplete ? '#c8f135' : '#111'}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
              />
            </Svg>
            {/* Inner white circle with time */}
            <View style={{
              position: 'absolute', top: STROKE_WIDTH + 8, left: STROKE_WIDTH + 8,
              right: STROKE_WIDTH + 8, bottom: STROKE_WIDTH + 8,
              borderRadius: 999, backgroundColor: '#fff',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 44, fontWeight: '800', color: '#111', letterSpacing: -2 }}>
                {formatTime(secondsLeft)}
              </Text>
              <Text style={{ fontSize: 10, color: '#bbb', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
                {isComplete ? 'COMPLETE' : 'REMAINING'}
              </Text>
            </View>
          </View>
        </View>

        {/* Instruction */}
        <Text style={{ fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20, marginBottom: 48 }}>
          {isComplete ? 'Well done. Your mind is ready.' : 'Sit comfortably, close your eyes,\nand focus on your breath.'}
        </Text>

        <View style={{ flex: 1 }} />

        {/* Button */}
        {!isComplete ? (
          <TouchableOpacity
            onPress={() => setIsRunning(!isRunning)}
            style={{ backgroundColor: '#111', borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginBottom: 32 }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
              {isRunning ? 'Pause' : secondsLeft === TOTAL_SECONDS ? 'Start Timer' : 'Resume'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ backgroundColor: '#c8f135', borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginBottom: 32 }}
          >
            <Text style={{ color: '#111', fontSize: 15, fontWeight: '700' }}>Done ✓</Text>
          </TouchableOpacity>
        )}

      </View>
    </SafeAreaView>
  )
}
