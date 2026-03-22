#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTViewManager.h>

// Native module — rep counting via Vision body pose
@interface RCT_EXTERN_MODULE(RepCounterModule, RCTEventEmitter)
RCT_EXTERN_METHOD(setExercise:(NSString *)exerciseId)
RCT_EXTERN_METHOD(startCamera:(nonnull NSNumber *)viewTag)
RCT_EXTERN_METHOD(stopCamera)
RCT_EXTERN_METHOD(resetCount)
RCT_EXTERN_METHOD(startCalibration)
RCT_EXTERN_METHOD(loadCalibration:(double)enterUp exitUp:(double)exitUp)
@end

// Native view — camera preview
@interface RCT_EXTERN_MODULE(RepCounterViewManager, RCTViewManager)
@end
