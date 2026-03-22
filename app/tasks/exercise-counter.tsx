import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, SafeAreaView,
  Animated, findNodeHandle,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Accelerometer } from 'expo-sensors'
import { RepCounter, RepCounterNativeView } from '../../modules/RepCounter'
import { useFirstName } from '../../utils/useFirstName'

// ─── Constants ────────────────────────────────────────────────────────────────

const EXERCISES = [
  { id: 'pushups', label: 'Push Ups', target: 20 },
  { id: 'squats',  label: 'Squats',   target: 20 },
  { id: 'situps',  label: 'Sit Ups',  target: 20 },
]

const EXERCISE_CONFIG: Record<string, {
  orientation: 'portrait' | 'landscape'
  instructions: string
  setupHint: string
}> = {
  pushups: {
    orientation: 'landscape',
    instructions: 'Place phone at elbow height, 2–3 metres to your side, in landscape. Your full body — wrist to ankle — must stay in frame throughout.\n\nWear fitted clothing and use a plain wall or floor as background if possible.',
    setupHint: 'Side-on · landscape · elbow height · 2–3 m away',
  },
  squats: {
    orientation: 'portrait',
    instructions: 'Stand your phone upright, 2–3 metres to your side, in portrait. Stand side-on to the camera with your full body — head to feet — visible.\n\nA plain background behind you improves accuracy.',
    setupHint: 'Side-on · portrait · hip height · 2–3 m away',
  },
  situps: {
    orientation: 'landscape',
    instructions: 'Place phone at floor level, 1.5–2 metres to your side, in landscape. Lie down side-on — your feet, hips, and shoulders must all be in frame when you\'re flat.\n\nA contrasting background and plain floor mat help the camera find your body.',
    setupHint: 'Side-on · landscape · floor level · 1.5–2 m away',
  },
}

const CAMERA_SUPPORTED     = RepCounter.isAvailable()
const PERSON_LOST_MS       = 800
const AI_SHOWN_KEY         = (id: string) => `unlockd_ai_shown_${id}`
const CALIBRATION_KEY      = (id: string) => `unlockd_calibration_${id}`
const ORIENT_SHOWN_SESSION = new Set<string>()   // persists for the lifetime of the app session

// Exercises that benefit from per-user calibration
const CALIBRATES = new Set(['pushups', 'situps'])

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function PhoneDiagram({ orientation }: { orientation: 'portrait' | 'landscape' }) {
  const isLand = orientation === 'landscape'
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{
        width:  isLand ? 96 : 52,
        height: isLand ? 52 : 96,
        borderRadius: 10,
        borderWidth: 2.5,
        borderColor: '#111',
        backgroundColor: '#fff',
      }} />
      <Text style={{ fontSize: 10, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase' }}>
        {isLand ? 'LANDSCAPE' : 'PORTRAIT'}
      </Text>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExerciseCounterScreen() {
  const params = useLocalSearchParams<{ exercise?: string; goal?: string }>()

  const initialExercise = EXERCISES.find(e => e.id === params.exercise) ?? EXERCISES[0]
  const goal = Math.max(1, Math.min(3, parseInt(params.goal ?? '1', 10)))

  const firstName = useFirstName()
  const [selectedExercise, setSelectedExercise] = useState(initialExercise)
  const [count, setCount]                       = useState(0)
  const [sessionCompleted, setSessionCompleted] = useState<string[]>([])
  const [sessionDone, setSessionDone]           = useState(false)
  const [cameraActive, setCameraActive]         = useState(false)
  const [cameraError, setCameraError]           = useState<string | null>(null)
  const [personDetected, setPersonDetected]     = useState(false)
  const [debugRise, setDebugRise]               = useState<number | null>(null)
  const [debugPhase, setDebugPhase]             = useState<string | null>(null)
  const [milestoneMsg, setMilestoneMsg]         = useState<string | null>(null)

  // Calibration
  const [calibrating, setCalibrating]           = useState(false)
  const [calibProgress, setCalibProgress]       = useState(0)

  // overlay: 'none' | 'instructions' | 'rotate'
  const [overlay, setOverlay]                   = useState<'none' | 'instructions' | 'rotate'>('none')
  const [deviceIsLandscape, setDeviceLandscape] = useState(false)

  const cameraViewRef    = useRef<any>(null)
  const flashAnim        = useRef(new Animated.Value(1)).current
  const detectPulse      = useRef(new Animated.Value(1)).current
  const personLostTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const milestoneTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Accelerometer: detect device orientation while overlay is showing ────────

  useEffect(() => {
    if (overlay === 'none') return
    Accelerometer.setUpdateInterval(250)
    const sub = Accelerometer.addListener(({ x, y }) => {
      setDeviceLandscape(Math.abs(x) > Math.abs(y) + 0.3)
    })
    return () => sub.remove()
  }, [overlay])

  // Auto-proceed on rotate overlay when device reaches correct orientation
  const requiredOrientation = EXERCISE_CONFIG[selectedExercise.id]?.orientation ?? 'portrait'
  const orientationCorrect  =
    requiredOrientation === 'landscape' ? deviceIsLandscape : !deviceIsLandscape

  useEffect(() => {
    if (overlay !== 'rotate' || !orientationCorrect) return
    const t = setTimeout(() => { setOverlay('none'); startCameraDirectly() }, 600)
    return () => clearTimeout(t)
  }, [overlay, orientationCorrect])   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Animations ───────────────────────────────────────────────────────────────

  const triggerFlash = useCallback(() => {
    flashAnim.setValue(2.2)
    Animated.spring(flashAnim, { toValue: 1, useNativeDriver: true, friction: 3, tension: 80 }).start()
  }, [flashAnim])

  useEffect(() => {
    if (personDetected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(detectPulse, { toValue: 0.25, duration: 700, useNativeDriver: true }),
          Animated.timing(detectPulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      ).start()
    } else {
      detectPulse.stopAnimation()
      detectPulse.setValue(1)
    }
  }, [personDetected, detectPulse])

  // ── Person-lost timer ────────────────────────────────────────────────────────

  const clearPersonTimer = useCallback(() => {
    if (personLostTimer.current) { clearTimeout(personLostTimer.current); personLostTimer.current = null }
  }, [])

  // ── Camera control ───────────────────────────────────────────────────────────

  async function startCameraDirectly() {
    RepCounter.setExercise(selectedExercise.id)
    setCameraError(null)
    setCount(0)
    setCalibrating(false)
    setCalibProgress(0)

    // Load stored calibration thresholds if available; otherwise start a calibration pass
    if (CALIBRATES.has(selectedExercise.id)) {
      const stored = await AsyncStorage.getItem(CALIBRATION_KEY(selectedExercise.id))
      if (stored) {
        const cal = JSON.parse(stored)
        RepCounter.loadCalibration(cal.enterUp, cal.exitUp)
        RepCounter.resetCount()
      } else {
        setCalibrating(true)
        RepCounter.startCalibration()
      }
    } else {
      RepCounter.resetCount()
    }

    setCameraActive(true)
  }

  function stopCameraDirectly() {
    RepCounter.stopCamera()
    setCameraActive(false)
    setCalibrating(false)
    clearPersonTimer()
    setPersonDetected(false)
  }

  // Called when user taps "Use AI rep counting" button
  async function handleAIButtonPress() {
    if (cameraActive) { stopCameraDirectly(); return }

    const exId  = selectedExercise.id
    const shown = await AsyncStorage.getItem(AI_SHOWN_KEY(exId))

    if (!shown) {
      setOverlay('instructions')
      return
    }

    if (!ORIENT_SHOWN_SESSION.has(exId)) {
      setOverlay('rotate')
      return
    }

    startCameraDirectly()
  }

  // Auto-start camera/AI mode when screen opens
  useEffect(() => {
    if (CAMERA_SUPPORTED) { handleAIButtonPress() }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleInstructionsDone() {
    await AsyncStorage.setItem(AI_SHOWN_KEY(selectedExercise.id), '1')
    ORIENT_SHOWN_SESSION.add(selectedExercise.id)
    setOverlay('none')
    startCameraDirectly()
  }

  function handleRotateDone() {
    ORIENT_SHOWN_SESSION.add(selectedExercise.id)
    setOverlay('none')
    startCameraDirectly()
  }

  // ── Camera listeners ─────────────────────────────────────────────────────────

  const onCameraViewLayout = useCallback(() => {
    if (!cameraActive || !cameraViewRef.current) return
    const tag = findNodeHandle(cameraViewRef.current)
    if (tag) RepCounter.startCamera(tag)
  }, [cameraActive])

  useEffect(() => {
    if (!cameraActive || !CAMERA_SUPPORTED) return

    const repSub = RepCounter.onRepCounted(({ count: c, flash }) => {
      setCount(c)
      if (flash) {
        triggerFlash()
        // Milestone messages at 5, 10, 15 reps
        const milestones = [5, 10, 15]
        if (firstName && milestones.includes(c)) {
          if (milestoneTimer.current) clearTimeout(milestoneTimer.current)
          setMilestoneMsg(`${c} reps, ${firstName}!`)
          milestoneTimer.current = setTimeout(() => setMilestoneMsg(null), 2000)
        }
      }
      if (c >= selectedExercise.target) {
        setSessionCompleted(prev => {
          if (prev.includes(selectedExercise.id)) return prev
          const next = [...prev, selectedExercise.id]
          onExerciseComplete(next)
          return next
        })
      }
    })

    const angleSub = RepCounter.onAngleUpdate(({ rise, phase }) => {
      setPersonDetected(true)
      if (rise !== undefined) setDebugRise(rise)
      if (phase !== undefined) setDebugPhase(phase)
      clearPersonTimer()
      personLostTimer.current = setTimeout(() => setPersonDetected(false), PERSON_LOST_MS)
    })

    const personLostSub = RepCounter.onPersonLost(() => {
      setPersonDetected(false)
      clearPersonTimer()
    })

    const calibProgressSub = RepCounter.onCalibrationProgress(({ repsObserved }) => {
      setCalibProgress(repsObserved)
      setPersonDetected(true)
      clearPersonTimer()
      personLostTimer.current = setTimeout(() => setPersonDetected(false), PERSON_LOST_MS)
    })

    const calibCompleteSub = RepCounter.onCalibrationComplete(async (data) => {
      // Persist for future sessions
      await AsyncStorage.setItem(CALIBRATION_KEY(selectedExercise.id), JSON.stringify({
        enterUp:  data.enterUp,
        exitUp:   data.exitUp,
        rangeMin: data.rangeMin,
        rangeMax: data.rangeMax,
      }))
      setCalibrating(false)
      setCalibProgress(0)
      // Now start counting from scratch
      RepCounter.resetCount()
      setCount(0)
    })

    const errorSub = RepCounter.onCameraError(({ message }) => {
      setCameraError(message)
      setCameraActive(false)
    })

    return () => {
      repSub?.remove()
      angleSub?.remove()
      personLostSub?.remove()
      calibProgressSub?.remove()
      calibCompleteSub?.remove()
      errorSub?.remove()
    }
  }, [cameraActive, selectedExercise, triggerFlash, clearPersonTimer, firstName])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      RepCounter.stopCamera()
      clearPersonTimer()
      if (milestoneTimer.current) clearTimeout(milestoneTimer.current)
    }
  }, [clearPersonTimer])

  // ── Completion logic ─────────────────────────────────────────────────────────

  async function handleSessionComplete() {
    const today   = new Date()
    const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
    const key     = `unlockd_completed_today_${dateKey}`
    const raw     = await AsyncStorage.getItem(key)
    const list: string[] = raw ? JSON.parse(raw) : []
    if (!list.includes('exercise')) list.push('exercise')
    await AsyncStorage.setItem(key, JSON.stringify(list))
    setSessionDone(true)
  }

  function onExerciseComplete(newCompleted: string[]) {
    if (newCompleted.length >= goal) {
      handleSessionComplete()
    } else {
      const next = EXERCISES.find(e => !newCompleted.includes(e.id))
      if (next) {
        setTimeout(() => {
          ORIENT_SHOWN_SESSION.delete(next.id)
          setSelectedExercise(next)
          setCount(0)
          setCameraError(null)
          setPersonDetected(false)
          clearPersonTimer()
          stopCameraDirectly()
        }, 800)
      }
    }
  }

  function selectExercise(ex: typeof EXERCISES[0]) {
    if (sessionCompleted.includes(ex.id)) return
    ORIENT_SHOWN_SESSION.delete(ex.id)
    setSelectedExercise(ex)
    setCount(0)
    setCameraError(null)
    clearPersonTimer()
    setPersonDetected(false)
    if (cameraActive) stopCameraDirectly()
  }

  function incrementCount() {
    setCount(prev => {
      const next = prev + 1
      if (next >= selectedExercise.target) {
        setSessionCompleted(sc => {
          if (sc.includes(selectedExercise.id)) return sc
          const updated = [...sc, selectedExercise.id]
          onExerciseComplete(updated)
          return updated
        })
      }
      return next
    })
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const progress          = Math.min(count / selectedExercise.target, 1)
  const bgColor           = cameraActive ? '#000' : '#f5f4f0'
  const textPrimary       = cameraActive ? '#fff' : '#111'
  const textSecondary     = cameraActive ? 'rgba(255,255,255,0.5)' : '#999'
  const isCurrentExDone   = sessionCompleted.includes(selectedExercise.id)
  const exCfg             = EXERCISE_CONFIG[selectedExercise.id]

  // Subtitle shown below the "Exercise" heading
  const headerSubtitle = (() => {
    if (!cameraActive) return 'Complete your reps to unlock this habit.'
    if (calibrating) return `Calibrating — do ${3 - calibProgress} more rep${3 - calibProgress !== 1 ? 's' : ''} at your natural pace.`
    return 'Camera is counting your reps.'
  })()

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>

      {/* Camera preview */}
      {cameraActive && CAMERA_SUPPORTED && RepCounterNativeView && (
        <RepCounterNativeView
          ref={cameraViewRef}
          onLayout={onCameraViewLayout}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}

      <View style={{ flex: 1, paddingHorizontal: 28 }}>

        {/* Back */}
        <TouchableOpacity onPress={() => { RepCounter.stopCamera(); router.back() }}
          style={{ paddingTop: 52, paddingBottom: 24, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 13, color: textSecondary }}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={{ fontSize: 28, fontWeight: '800', color: textPrimary, letterSpacing: -0.5, marginBottom: 4 }}>
          Exercise
        </Text>
        <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 8 }}>
          {headerSubtitle}
        </Text>

        {/* Goal progress */}
        <View style={{ marginBottom: 20 }}>
          {goal > 1 && (
            <Text style={{ fontSize: 12, color: textSecondary }}>
              {sessionCompleted.length} of {goal} exercises done
            </Text>
          )}
        </View>

        {/* Exercise selector tabs */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32 }}>
          {EXERCISES.map(ex => {
            const isDone   = sessionCompleted.includes(ex.id)
            const isActive = selectedExercise.id === ex.id
            return (
              <TouchableOpacity
                key={ex.id}
                onPress={() => selectExercise(ex)}
                activeOpacity={isDone ? 1 : 0.7}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 50, alignItems: 'center',
                  backgroundColor: isDone ? '#c8f135'
                    : isActive ? (cameraActive ? '#c8f135' : '#111')
                    : (cameraActive ? 'rgba(255,255,255,0.12)' : '#fff'),
                  borderWidth: 0.5,
                  borderColor: isDone ? '#c8f135'
                    : isActive ? (cameraActive ? '#c8f135' : '#111')
                    : (cameraActive ? 'rgba(255,255,255,0.2)' : '#e0dfd8'),
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: '600',
                  color: isDone ? '#111'
                    : isActive ? (cameraActive ? '#111' : '#fff')
                    : textSecondary,
                }}>
                  {isDone ? '✓' : ex.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Rep counter */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          {cameraActive ? (
            <View style={{ alignItems: 'center' }}>
              {calibrating ? (
                // Calibration mode — show progress instead of count
                <View style={{ alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 72, fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: -4, lineHeight: 80 }}>
                    {calibProgress}/3
                  </Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
                    CALIBRATION REPS
                  </Text>
                </View>
              ) : (
                <>
                  <Animated.Text style={{
                    fontSize: 120, fontWeight: '800', color: '#c8f135',
                    letterSpacing: -6, lineHeight: 120,
                    transform: [{ scale: flashAnim }],
                  }}>
                    {count}
                  </Animated.Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
                    OF {selectedExercise.target} REPS
                  </Text>
                </>
              )}

              {/* Milestone message */}
              {milestoneMsg && (
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#c8f135', marginTop: 8, letterSpacing: 0.2 }}>
                  {milestoneMsg}
                </Text>
              )}

              {/* Person detection badge */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                marginTop: 20, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 50,
                backgroundColor: personDetected ? 'rgba(200,241,53,0.15)' : 'rgba(255,80,80,0.15)',
                borderWidth: 1.5,
                borderColor: personDetected ? '#c8f135' : 'rgba(255,80,80,0.7)',
              }}>
                <Animated.View style={{
                  width: 9, height: 9, borderRadius: 4.5,
                  backgroundColor: personDetected ? '#c8f135' : '#ff5050',
                  opacity: personDetected ? detectPulse : 1,
                }} />
                <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 0.2, color: personDetected ? '#c8f135' : '#ff5050' }}>
                  {personDetected ? 'Person detected' : 'No person detected'}
                </Text>
              </View>

              {/* Debug overlay — sit-up rise value and phase */}
              {selectedExercise.id === 'situps' && debugRise !== null && (
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8, letterSpacing: 1 }}>
                  rise {(debugRise * 100).toFixed(0)} · {debugPhase}
                </Text>
              )}
            </View>
          ) : (
            <View style={{
              width: 200, height: 200, borderRadius: 100,
              backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e0dfd8',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 64, fontWeight: '800', color: '#111', letterSpacing: -3, lineHeight: 68 }}>
                {count}
              </Text>
              <Text style={{ fontSize: 10, color: '#bbb', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
                OF {selectedExercise.target} REPS
              </Text>
            </View>
          )}
          {!cameraActive && (
            <View style={{ marginTop: 16, width: 200, height: 4, backgroundColor: '#e0dfd8', borderRadius: 2 }}>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: isCurrentExDone ? '#c8f135' : '#111', width: progress * 200 }} />
            </View>
          )}
        </View>

        {/* Manual +/- */}
        {!sessionDone && !isCurrentExDone && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => setCount(c => Math.max(0, c - 1))}
              style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: cameraActive ? 'rgba(255,255,255,0.1)' : '#fff',
                borderWidth: 0.5, borderColor: cameraActive ? 'rgba(255,255,255,0.2)' : '#e0dfd8',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 24, color: textPrimary, fontWeight: '300' }}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={incrementCount}
              style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: cameraActive ? 'rgba(255,255,255,0.15)' : '#111',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 24, color: '#fff', fontWeight: '300' }}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Camera error */}
        {cameraError && (
          <Text style={{ fontSize: 12, color: '#ff6b6b', textAlign: 'center', marginBottom: 12 }}>
            {cameraError}
          </Text>
        )}

        {/* AI toggle */}
        {CAMERA_SUPPORTED && !sessionDone && !isCurrentExDone && (
          <TouchableOpacity
            onPress={handleAIButtonPress}
            style={{
              alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingHorizontal: 20, paddingVertical: 10, borderRadius: 50, borderWidth: 1,
              borderColor: cameraActive ? '#c8f135' : '#e0dfd8',
              backgroundColor: cameraActive ? 'rgba(200,241,53,0.12)' : 'transparent',
              marginBottom: 24,
            }}
          >
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: cameraActive ? '#c8f135' : '#ccc' }} />
            <Text style={{ fontSize: 12, color: cameraActive ? '#c8f135' : textSecondary, fontWeight: '600' }}>
              {cameraActive ? 'AI counting — tap to stop' : 'Use AI rep counting'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Instruction text */}
        {!cameraActive && !sessionDone && (
          <Text style={{ fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 }}>
            {isCurrentExDone
              ? 'Nice! Pick your next exercise above.'
              : CAMERA_SUPPORTED
                ? 'Tap + manually, or enable AI rep counting.'
                : 'Tap + for each rep you complete.'}
          </Text>
        )}

        <View style={{ flex: 1 }} />

        {/* Primary button */}
        {sessionDone ? (
          <TouchableOpacity
            onPress={() => { RepCounter.stopCamera(); router.replace('/routine') }}
            style={{ backgroundColor: '#c8f135', borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginBottom: 32 }}
          >
            <Text style={{ color: '#111', fontSize: 15, fontWeight: '700' }}>
              {firstName ? `Great work, ${firstName}! ✓` : 'Done ✓'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => { RepCounter.stopCamera(); router.back() }}
            style={{
              backgroundColor: cameraActive ? 'rgba(255,255,255,0.08)' : '#fff',
              borderWidth: 0.5, borderColor: cameraActive ? 'rgba(255,255,255,0.15)' : '#e0dfd8',
              borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginBottom: 32,
            }}
          >
            <Text style={{ color: textSecondary, fontSize: 15, fontWeight: '400' }}>Skip for now</Text>
          </TouchableOpacity>
        )}

      </View>

      {/* ── Instructions overlay (first use) ── */}
      {overlay === 'instructions' && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#f5f4f0',
        }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flex: 1, paddingHorizontal: 28 }}>

              <TouchableOpacity onPress={() => setOverlay('none')}
                style={{ paddingTop: 52, paddingBottom: 32, alignSelf: 'flex-start' }}>
                <Text style={{ fontSize: 13, color: '#999' }}>← Back</Text>
              </TouchableOpacity>

              <Text style={{ fontSize: 11, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                AI REP COUNTING
              </Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#111', letterSpacing: -0.5, marginBottom: 4 }}>
                {EXERCISES.find(e => e.id === selectedExercise.id)?.label}
              </Text>
              <Text style={{ fontSize: 13, color: '#999', marginBottom: 48 }}>
                How to set up your camera
              </Text>

              {/* Phone orientation diagram */}
              <View style={{ alignItems: 'center', marginBottom: 40 }}>
                <PhoneDiagram orientation={exCfg.orientation} />
              </View>

              {/* Instructions text */}
              <View style={{
                backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e0dfd8',
                borderRadius: 14, padding: 20, marginBottom: 24,
              }}>
                <Text style={{ fontSize: 15, color: '#111', lineHeight: 24, fontWeight: '500' }}>
                  {exCfg.instructions}
                </Text>
              </View>

              {/* Setup hint badge */}
              <Text style={{ fontSize: 11, color: '#aaa', textAlign: 'center', letterSpacing: 0.5, marginBottom: 8 }}>
                {exCfg.setupHint}
              </Text>

              <View style={{ flex: 1 }} />

              <TouchableOpacity
                onPress={handleInstructionsDone}
                style={{ backgroundColor: '#111', borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginBottom: 32 }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Got it — start camera</Text>
              </TouchableOpacity>

            </View>
          </SafeAreaView>
        </View>
      )}

      {/* ── Rotate overlay (orientation reminder, once per session) ── */}
      {overlay === 'rotate' && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#111',
          alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 40,
        }}>

          <PhoneDiagram orientation={exCfg.orientation} />

          <View style={{ height: 36 }} />

          <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 }}>
            Rotate your phone
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20 }}>
            {exCfg.orientation === 'landscape'
              ? 'Turn your phone sideways (landscape) and place it to the side of your exercise space.'
              : 'Hold your phone upright (portrait) and stand it to the side of your exercise space.'}
          </Text>

          {/* Live orientation indicator */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            marginTop: 32, paddingHorizontal: 16, paddingVertical: 8,
            borderRadius: 50,
            backgroundColor: orientationCorrect ? 'rgba(200,241,53,0.15)' : 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            borderColor: orientationCorrect ? '#c8f135' : 'rgba(255,255,255,0.15)',
          }}>
            <View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: orientationCorrect ? '#c8f135' : '#555',
            }} />
            <Text style={{ fontSize: 12, color: orientationCorrect ? '#c8f135' : 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
              {orientationCorrect ? 'Good orientation — starting…' : `Waiting for ${exCfg.orientation}`}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleRotateDone}
            style={{
              marginTop: 40, paddingHorizontal: 28, paddingVertical: 12,
              borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Start anyway</Text>
          </TouchableOpacity>

        </View>
      )}

    </SafeAreaView>
  )
}
