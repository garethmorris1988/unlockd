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
}
