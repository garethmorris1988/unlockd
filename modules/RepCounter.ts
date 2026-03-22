import { NativeModules, NativeEventEmitter, requireNativeComponent, Platform } from 'react-native'

const { RepCounterModule: Native } = NativeModules

// Native camera preview view
export const RepCounterNativeView = Platform.OS === 'ios'
  ? requireNativeComponent<{ style?: object; onLayout?: () => void }>('RepCounterView')
  : null

// Event emitter (only instantiated when the native module is present)
const emitter = Native ? new NativeEventEmitter(Native) : null

export const RepCounter = {
  isAvailable(): boolean {
    return Platform.OS === 'ios' && !!Native
  },

  setExercise(exerciseId: string): void {
    Native?.setExercise(exerciseId)
  },

  startCamera(viewTag: number): void {
    Native?.startCamera(viewTag)
  },

  stopCamera(): void {
    Native?.stopCamera()
  },

  resetCount(): void {
    Native?.resetCount()
  },

  /** Begin a calibration session — first 3 reps are observed, not counted. */
  startCalibration(): void {
    Native?.startCalibration()
  },

  /**
   * Load previously-computed calibration thresholds.
   * For sit-ups: enterUp = suEnterUp, exitUp = suExitUp
   * For push-ups: enterUp = calibPuUp (full extension), exitUp = calibPuDown (bottom of rep)
   */
  loadCalibration(enterUp: number, exitUp: number): void {
    Native?.loadCalibration(enterUp, exitUp)
  },

  onRepCounted(cb: (data: { count: number; flash: boolean }) => void) {
    return emitter?.addListener('onRepCounted', cb)
  },

  onAngleUpdate(cb: (data: { angle: number; rise?: number; phase?: string }) => void) {
    return emitter?.addListener('onAngleUpdate', cb)
  },

  onCameraReady(cb: () => void) {
    return emitter?.addListener('onCameraReady', cb)
  },

  onCameraError(cb: (data: { message: string }) => void) {
    return emitter?.addListener('onCameraError', cb)
  },

  /** Fired when Vision loses the body pose for several consecutive frames (sit-ups only). */
  onPersonLost(cb: () => void) {
    return emitter?.addListener('onPersonLost', cb)
  },

  /** Fired after each calibration rep. */
  onCalibrationProgress(cb: (data: { repsObserved: number; totalNeeded: number }) => void) {
    return emitter?.addListener('onCalibrationProgress', cb)
  },

  /** Fired when calibration is complete with the derived thresholds. */
  onCalibrationComplete(cb: (data: {
    enterUp: number
    exitUp: number
    rangeMin: number
    rangeMax: number
  }) => void) {
    return emitter?.addListener('onCalibrationComplete', cb)
  },
}
