import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Svg, Circle } from 'react-native-svg'
import AppleHealthKit, { HealthKitPermissions } from 'react-native-health'

const STEP_GOAL = 2000
const CIRCLE_SIZE = 220
const STROKE_WIDTH = 4
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function StepsScreen() {
  const [steps, setSteps] = useState(0)
  const [healthStatus, setHealthStatus] = useState<'loading' | 'granted' | 'denied'>('loading')

  const progress = Math.min(steps / STEP_GOAL, 1)
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  async function handleComplete() {
    const today = new Date()
    const dateKey = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
    const storageKey = 'unlockd_completed_today_' + dateKey
    const existing = await AsyncStorage.getItem(storageKey)
    const currentList: string[] = existing ? JSON.parse(existing) : []
    if (!currentList.includes('steps')) currentList.push('steps')
    await AsyncStorage.setItem(storageKey, JSON.stringify(currentList))
  }

  useEffect(() => {
    try {
      const permissions = {
        permissions: {
          read: [AppleHealthKit.Constants.Permissions.StepCount],
          write: [] as string[],
        },
      } as HealthKitPermissions

      console.log('Initialising HealthKit...')
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        console.log('HealthKit callback received, error:', error)
        if (error) {
          console.log('HealthKit init error:', error)
          setHealthStatus('denied')
          setSteps(0)
          return
        }
        setHealthStatus('granted')

        const today = new Date()
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)

        AppleHealthKit.getStepCount(
          { date: startOfDay.toISOString() },
          (err: string, results: any) => {
            if (err) {
              console.log('Step count error:', err)
              setSteps(0)
              return
            }
            if (results && results.value) {
              setSteps(Math.round(results.value))
            }
          }
        )
      })
    } catch (e) {
      console.log('HealthKit exception:', e)
      setHealthStatus('denied')
      setSteps(0)
    }
    const timeout = setTimeout(() => {
      setHealthStatus(prev => prev === 'loading' ? 'denied' : prev)
    }, 5000)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f4f0' }}>
      <View style={{ flex: 1, paddingHorizontal: 28 }}>

        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={{ paddingTop: 52, paddingBottom: 24, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 13, color: '#999' }}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#111', letterSpacing: -0.5, marginBottom: 4 }}>Steps</Text>
        <Text style={{ fontSize: 13, color: '#999', marginBottom: 48 }}>Get your body moving before the day starts.</Text>

        {/* Step circle */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
            <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={{ position: 'absolute', top: 0, left: 0 }}>
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke="#e0dfd8"
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke="#c8f135"
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
              />
            </Svg>
            <View style={{
              position: 'absolute', top: STROKE_WIDTH + 8, left: STROKE_WIDTH + 8,
              right: STROKE_WIDTH + 8, bottom: STROKE_WIDTH + 8,
              borderRadius: 999, backgroundColor: '#fff',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 44, fontWeight: '800', color: '#111', letterSpacing: -2 }}>
                {healthStatus === 'loading' ? '...' : healthStatus === 'denied' ? 'N/A' : steps.toLocaleString()}
              </Text>
              <Text style={{ fontSize: 10, color: '#bbb', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
                {healthStatus === 'denied' ? 'HEALTHKIT DENIED' : 'STEPS TODAY'}
              </Text>
            </View>
          </View>
        </View>

        {/* Goal row */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <Text style={{ fontSize: 13, color: '#999' }}>Goal:</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#111' }}>{STEP_GOAL.toLocaleString()} steps</Text>
        </View>

        {/* Info card */}
        {healthStatus === 'denied' && (
          <View style={{ backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e0dfd8', borderRadius: 14, padding: 16, marginBottom: 48 }}>
            <Text style={{ fontSize: 11, color: '#aaa', lineHeight: 18, textAlign: 'center' }}>
              Please enable Health access in{'\n'}Settings → Privacy & Security → Health → Unlockd
            </Text>
          </View>
        )}

        {healthStatus === 'loading' && (
          <View style={{ backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e0dfd8', borderRadius: 14, padding: 16, marginBottom: 48 }}>
            <Text style={{ fontSize: 11, color: '#aaa', lineHeight: 18, textAlign: 'center' }}>
              Loading step data...
            </Text>
          </View>
        )}

        {healthStatus === 'granted' && (
          <View style={{ backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e0dfd8', borderRadius: 14, padding: 16, marginBottom: 48 }}>
            <Text style={{ fontSize: 11, color: '#aaa', lineHeight: 18, textAlign: 'center' }}>
              Synced from Apple Health
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }} />

        {/* Button */}
        <TouchableOpacity
          onPress={async () => {
            if (steps >= STEP_GOAL) {
              await handleComplete()
            }
            router.back()
          }}
          style={{ backgroundColor: '#111', borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginBottom: 32 }}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
            {steps >= STEP_GOAL ? 'Mark Complete' : 'Get Moving →'}
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  )
}
