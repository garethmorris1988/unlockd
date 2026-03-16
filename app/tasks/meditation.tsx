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
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [countdown, setCountdown] = useState<number | null>(null)
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
            if (soundEnabled) playTone('minute')
          }
          if (next <= 0) {
            clearInterval(interval.current!)
            setIsComplete(true)
            setIsRunning(false)
            if (soundEnabled) playTone('complete')
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

  function handleStart() {
    setCountdown(3)
  }

  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      setCountdown(null)
      setIsRunning(true)
      return
    }
    const timer = setTimeout(() => {
      setCountdown(c => c !== null ? c - 1 : null)
    }, 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const strokeDashoffset = CIRCUMFERENCE * (secondsLeft / TOTAL_SECONDS)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f4f0' }}>
      {countdown !== null && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#f5f4f0',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}>
          <Text style={{ fontSize: 11, color: '#999', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 32 }}>
            GET READY
          </Text>
          <Text style={{ fontSize: 96, fontWeight: '800', color: '#111', letterSpacing: -4, lineHeight: 100 }}>
            {countdown === 0 ? 'GO' : countdown}
          </Text>
          <Text style={{ fontSize: 15, color: '#999', marginTop: 32, textAlign: 'center', lineHeight: 24 }}>
            {countdown === 3 ? 'Find a comfortable position.' : countdown === 2 ? 'Close your eyes.' : 'Focus on your breath.'}
          </Text>
        </View>
      )}
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
        {!isComplete && (
          <>
            <Text style={{ fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
              {isRunning
                ? 'Sit comfortably, close your eyes,\nand focus on your breath.'
                : secondsLeft === TOTAL_SECONDS
                ? 'A gentle sound will play at each minute\nand when the timer ends.'
                : 'Paused. Tap Resume to continue.'}
            </Text>

            {/* Sound toggle */}
            <TouchableOpacity
              onPress={() => setSoundEnabled(s => !s)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'center',
                gap: 8,
                backgroundColor: '#fff',
                borderWidth: 0.5,
                borderColor: '#e0dfd8',
                borderRadius: 50,
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
            >
              <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: soundEnabled ? '#c8f135' : '#ddd',
              }} />
              <Text style={{ fontSize: 12, color: '#999' }}>
                {soundEnabled ? 'Sounds on' : 'Sounds off'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {isComplete && (
          <Text style={{ fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 }}>
            Well done. Your mind is ready.
          </Text>
        )}

        <View style={{ flex: 1 }} />

        {/* Button */}
        {!isComplete ? (
          <TouchableOpacity
            onPress={() => isRunning ? setIsRunning(false) : secondsLeft === TOTAL_SECONDS ? handleStart() : setIsRunning(true)}
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
