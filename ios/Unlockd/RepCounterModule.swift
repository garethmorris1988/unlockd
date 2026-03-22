import Foundation
import AVFoundation
import Vision
import React

@objc(RepCounterModule)
class RepCounterModule: RCTEventEmitter, AVCaptureVideoDataOutputSampleBufferDelegate {

  // MARK: - Types

  private enum ExerciseMode { case pushup, squat, situp }
  private enum RepPhase    { case unknown, up, down }

  // MARK: - Session

  private var captureSession: AVCaptureSession?
  private let sessionQueue = DispatchQueue(label: "com.unlockd.repcounter.session", qos: .userInitiated)
  private let processQueue = DispatchQueue(label: "com.unlockd.repcounter.process", qos: .userInitiated)
  private var frameCounter = 0

  // MARK: - Shared detection state (reset by setExercise / resetCount)

  private var exerciseMode: ExerciseMode = .pushup
  private var repCount = 0
  private var phase: RepPhase = .unknown
  private let smoothingFactor = 0.35
  private let situpSmoothingFactor = 0.45  // sit-ups are slow movements — less reactivity needed

  // Push-up — dynamic thresholds (overridden by calibration)
  private var smoothedElbow: Double = 180.0
  private var calibPuDown: Double = 110.0   // elbow angle < this = down phase
  private var calibPuUp:   Double = 150.0   // elbow angle > this = up phase (rep counted)

  // Squat — knee angle primary, hip angle secondary confirmation
  private var smoothedKnee:     Double = 180.0
  private var smoothedSquatHip: Double = 180.0
  private let SQ_KNEE_DOWN: Double = 100.0
  private let SQ_KNEE_UP:   Double = 155.0
  private let SQ_HIP_DOWN:  Double = 110.0
  private let SQ_HIP_UP:    Double = 150.0

  // Sit-up — shoulder-hip Y rise (normalised Vision Y, 0 = top of frame)
  // Hysteresis: different thresholds for entering vs exiting each phase to prevent oscillation.
  //   Enter .up:   rise > suEnterUp  (crosses upward — person is sitting up)
  //   Exit  .up:   rise < suExitUp   (must fully return to flat — rep is counted)
  //   Initial .down detection uses SU_ENTER_DOWN (person is lying flat at start)
  private var smoothedRise: Double = 0.0
  private var suEnterUp:  Double = 0.20   // dynamic — overridden by calibration
  private var suExitUp:   Double = 0.13   // dynamic — overridden by calibration
  private let SU_ENTER_DOWN: Double = 0.15

  // Person-lost tracking for sit-ups (Vision often misses body when lying flat)
  private var situpMissFrames = 0
  private let SITUP_MISS_THRESHOLD = 5  // emit onPersonLost after 5 consecutive missed frames

  // MARK: - Calibration

  private var calibrationMode = false
  private let calibrationRepsNeeded = 3
  private var calibObservedMin: Double = Double.infinity
  private var calibObservedMax: Double = -Double.infinity
  private var calibLastPhase: RepPhase = .unknown
  private var calibRepCount = 0

  private lazy var poseRequest = VNDetectHumanBodyPoseRequest()

  // MARK: - RCTEventEmitter

  override func supportedEvents() -> [String]! {
    return [
      "onRepCounted",
      "onAngleUpdate",
      "onCameraReady",
      "onCameraError",
      "onPersonLost",
      "onCalibrationProgress",
      "onCalibrationComplete",
    ]
  }

  override static func requiresMainQueueSetup() -> Bool { return false }

  // MARK: - JS-callable methods

  @objc func setExercise(_ exerciseId: NSString) {
    let id = exerciseId as String
    repCount        = 0
    phase           = .unknown
    calibrationMode = false
    situpMissFrames = 0
    smoothedElbow    = 180.0
    smoothedKnee     = 180.0
    smoothedSquatHip = 180.0
    smoothedRise     = 0.0
    // Reset dynamic thresholds to safe defaults
    calibPuDown = 110.0
    calibPuUp   = 150.0
    suEnterUp   = 0.20
    suExitUp    = 0.13
    switch id {
    case "squats": exerciseMode = .squat
    case "situps": exerciseMode = .situp; phase = .down  // person starts lying flat
    default:       exerciseMode = .pushup
    }
    sendEvent(withName: "onRepCounted", body: ["count": 0, "flash": false])
  }

  /// Load previously-computed calibration thresholds for the current exercise.
  /// For sit-ups: enterUp = suEnterUp, exitUp = suExitUp
  /// For push-ups: enterUp = calibPuUp (full extension), exitUp = calibPuDown (bottom of rep)
  @objc func loadCalibration(_ enterUp: Double, exitUp: Double) {
    switch exerciseMode {
    case .situp:
      suEnterUp = enterUp
      suExitUp  = exitUp
    case .pushup:
      calibPuUp   = enterUp
      calibPuDown = exitUp
    case .squat:
      break
    }
  }

  /// Begin a calibration session. The first `calibrationRepsNeeded` reps are observed
  /// without counting; thresholds are then derived from the user's actual range of motion.
  @objc func startCalibration() {
    calibrationMode  = true
    calibObservedMin = Double.infinity
    calibObservedMax = -Double.infinity
    calibLastPhase   = .unknown
    calibRepCount    = 0
    repCount         = 0
    phase            = exerciseMode == .situp ? .down : .unknown
    DispatchQueue.main.async { [weak self] in
      self?.sendEvent(withName: "onCalibrationProgress", body: [
        "repsObserved": 0,
        "totalNeeded":  self?.calibrationRepsNeeded ?? 3,
      ])
    }
  }

  @objc func startCamera(_ viewTag: NSNumber) {
    AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
      guard let self = self else { return }
      if granted {
        self.sessionQueue.async { self.setupCaptureSession(viewTag: viewTag) }
      } else {
        self.sendEvent(withName: "onCameraError", body: ["message": "Camera permission denied"])
      }
    }
  }

  @objc func stopCamera() {
    sessionQueue.async { [weak self] in
      self?.captureSession?.stopRunning()
      self?.captureSession = nil
    }
  }

  @objc func resetCount() {
    repCount         = 0
    calibrationMode  = false
    situpMissFrames  = 0
    phase            = exerciseMode == .situp ? .down : .unknown
    smoothedElbow    = 180.0
    smoothedKnee     = 180.0
    smoothedSquatHip = 180.0
    smoothedRise     = 0.0
    sendEvent(withName: "onRepCounted", body: ["count": 0, "flash": false])
  }

  // MARK: - Session setup

  private func setupCaptureSession(viewTag: NSNumber) {
    let session = AVCaptureSession()
    session.sessionPreset = .vga640x480

    guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front)
                    ?? AVCaptureDevice.default(for: .video) else {
      sendEvent(withName: "onCameraError", body: ["message": "No camera available"]); return
    }
    guard let input = try? AVCaptureDeviceInput(device: device), session.canAddInput(input) else {
      sendEvent(withName: "onCameraError", body: ["message": "Cannot access camera"]); return
    }
    session.addInput(input)

    let videoOutput = AVCaptureVideoDataOutput()
    videoOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange]
    videoOutput.setSampleBufferDelegate(self, queue: processQueue)
    videoOutput.alwaysDiscardsLateVideoFrames = true

    guard session.canAddOutput(videoOutput) else {
      sendEvent(withName: "onCameraError", body: ["message": "Cannot add video output"]); return
    }
    session.addOutput(videoOutput)

    self.captureSession = session
    session.startRunning()

    DispatchQueue.main.async { [weak self] in
      guard let self = self, let bridge = self.bridge else { return }
      if let view = bridge.uiManager.view(forReactTag: viewTag) as? RepCounterView {
        view.setSession(session)
      }
      self.sendEvent(withName: "onCameraReady", body: [:])
    }
  }

  // MARK: - Frame capture

  func captureOutput(_ output: AVCaptureOutput,
                     didOutput sampleBuffer: CMSampleBuffer,
                     from connection: AVCaptureConnection) {
    frameCounter += 1
    guard frameCounter % 3 == 0 else { return }
    guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

    // .leftMirrored corrects front-camera landscape buffer to portrait coordinate space
    let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .leftMirrored)
    guard (try? handler.perform([poseRequest])) != nil,
          let observation = poseRequest.results?.first else {
      // No pose observation — only emit person-lost for sit-ups (most prone to this)
      if exerciseMode == .situp {
        situpMissFrames += 1
        if situpMissFrames >= SITUP_MISS_THRESHOLD {
          emitPersonLost()
        }
      }
      return
    }

    switch exerciseMode {
    case .pushup: processPushup(observation)
    case .squat:  processSquat(observation)
    case .situp:  processSitup(observation)
    }
  }

  // MARK: - Generic angle helper (rotation-invariant dot-product)

  /// Angle in degrees at joint `b` formed by the vectors b→a and b→c.
  private func angleAtJoint(_ obs: VNHumanBodyPoseObservation,
                             a: VNHumanBodyPoseObservation.JointName,
                             b: VNHumanBodyPoseObservation.JointName,
                             c: VNHumanBodyPoseObservation.JointName,
                             minConfidence: Float = 0.3) -> Double? {
    guard let pa = try? obs.recognizedPoint(a), pa.confidence > minConfidence,
          let pb = try? obs.recognizedPoint(b), pb.confidence > minConfidence,
          let pc = try? obs.recognizedPoint(c), pc.confidence > minConfidence else { return nil }

    let va = CGVector(dx: pa.location.x - pb.location.x, dy: pa.location.y - pb.location.y)
    let vc = CGVector(dx: pc.location.x - pb.location.x, dy: pc.location.y - pb.location.y)
    let dot = va.dx * vc.dx + va.dy * vc.dy
    let mag = sqrt(va.dx*va.dx + va.dy*va.dy) * sqrt(vc.dx*vc.dx + vc.dy*vc.dy)
    guard mag > 0.0001 else { return nil }
    return Double(acos(max(-1.0, min(1.0, dot / mag))) * 180.0 / .pi)
  }

  // MARK: - Push-up detection

  private func processPushup(_ obs: VNHumanBodyPoseObservation) {
    // Gate: only count reps when the body is in a plank (approximately horizontal)
    guard isPushupPlank(obs) else { return }

    let l = angleAtJoint(obs, a: .leftShoulder,  b: .leftElbow,  c: .leftWrist)
    let r = angleAtJoint(obs, a: .rightShoulder, b: .rightElbow, c: .rightWrist)

    let lConf = (try? obs.recognizedPoint(.leftElbow))?.confidence  ?? 0
    let rConf = (try? obs.recognizedPoint(.rightElbow))?.confidence ?? 0

    // Use the higher-confidence side — avoids phantom angle jumps when one side drops out
    let raw: Double
    switch (l, r) {
    case let (l?, r?): raw = lConf >= rConf ? l : r
    case let (l?, nil): raw = l
    case let (nil, r?): raw = r
    default: return
    }

    smoothedElbow = smoothedElbow * (1 - smoothingFactor) + raw * smoothingFactor

    if calibrationMode {
      calibObservedMin = min(calibObservedMin, smoothedElbow)
      calibObservedMax = max(calibObservedMax, smoothedElbow)
      trackCalibrationRep(isDown: smoothedElbow < calibPuDown, isUp: smoothedElbow > calibPuUp)
      emitAngle(Int(smoothedElbow))
      return
    }

    switch phase {
    case .unknown: phase = smoothedElbow < calibPuDown ? .down : .up
    case .up:      if smoothedElbow < calibPuDown { phase = .down }
    case .down:
      if smoothedElbow > calibPuUp {
        phase = .up
        repCount += 1
        emitRep(repCount)
      }
    }
    emitAngle(Int(smoothedElbow))
  }

  /// Returns true when shoulder-to-hip vector is approximately horizontal,
  /// confirming the person is in a plank position rather than standing or crouching.
  private func isPushupPlank(_ obs: VNHumanBodyPoseObservation) -> Bool {
    let shoulderJoints: [VNHumanBodyPoseObservation.JointName] = [.leftShoulder, .rightShoulder]
    let hipJoints:      [VNHumanBodyPoseObservation.JointName] = [.leftHip,      .rightHip]

    for (shoulderJoint, hipJoint) in zip(shoulderJoints, hipJoints) {
      guard let shoulder = try? obs.recognizedPoint(shoulderJoint), shoulder.confidence > 0.3,
            let hip      = try? obs.recognizedPoint(hipJoint),      hip.confidence > 0.3
      else { continue }

      let dx = abs(shoulder.location.x - hip.location.x)
      let dy = abs(shoulder.location.y - hip.location.y)
      // Body is within ~35 degrees of horizontal (dx > 70% of dy is a rough ~35° threshold)
      return dx > dy * 0.7
    }
    // Cannot verify plank — allow rather than block (fail open)
    return true
  }

  // MARK: - Squat detection

  private func processSquat(_ obs: VNHumanBodyPoseObservation) {
    let lKnee = angleAtJoint(obs, a: .leftHip,       b: .leftKnee,  c: .leftAnkle)
    let rKnee = angleAtJoint(obs, a: .rightHip,      b: .rightKnee, c: .rightAnkle)
    let lHip  = angleAtJoint(obs, a: .leftShoulder,  b: .leftHip,   c: .leftKnee)
    let rHip  = angleAtJoint(obs, a: .rightShoulder, b: .rightHip,  c: .rightKnee)

    let rawKnee: Double
    let rawHip:  Double
    if      let k = lKnee, let h = lHip { rawKnee = k; rawHip = h }
    else if let k = rKnee, let h = rHip { rawKnee = k; rawHip = h }
    else { return }

    smoothedKnee     = smoothedKnee     * (1 - smoothingFactor) + rawKnee * smoothingFactor
    smoothedSquatHip = smoothedSquatHip * (1 - smoothingFactor) + rawHip  * smoothingFactor

    let isDown = smoothedKnee < SQ_KNEE_DOWN && smoothedSquatHip < SQ_HIP_DOWN
    let isUp   = smoothedKnee > SQ_KNEE_UP   && smoothedSquatHip > SQ_HIP_UP

    switch phase {
    case .unknown: phase = isDown ? .down : .up
    case .up:      if isDown { phase = .down }
    case .down:
      if isUp {
        phase = .up
        repCount += 1
        emitRep(repCount)
      }
    }
    emitAngle(Int(smoothedKnee))
  }

  // MARK: - Sit-up detection

  private func processSitup(_ obs: VNHumanBodyPoseObservation) {
    guard let raw = shoulderHipRise(obs) else {
      situpMissFrames += 1
      if situpMissFrames >= SITUP_MISS_THRESHOLD {
        emitPersonLost()
      }
      return
    }

    situpMissFrames = 0  // reset on successful detection

    smoothedRise = smoothedRise * (1 - situpSmoothingFactor) + raw * situpSmoothingFactor

    if calibrationMode {
      calibObservedMin = min(calibObservedMin, smoothedRise)
      calibObservedMax = max(calibObservedMax, smoothedRise)
      trackCalibrationRep(isDown: smoothedRise < SU_ENTER_DOWN, isUp: smoothedRise > suEnterUp)
      emitSitupDebug()
      return
    }

    switch phase {
    case .unknown:
      phase = smoothedRise < SU_ENTER_DOWN ? .down : (smoothedRise > suEnterUp ? .up : .unknown)
    case .down:
      if smoothedRise > suEnterUp { phase = .up }
    case .up:
      if smoothedRise < suExitUp {
        phase = .down
        repCount += 1
        emitRep(repCount)
      }
    }
    emitSitupDebug()
  }

  private func emitSitupDebug() {
    let phaseStr: String
    switch phase {
    case .down:    phaseStr = "down"
    case .up:      phaseStr = "up"
    case .unknown: phaseStr = "unknown"
    }
    let riseSnap = smoothedRise
    DispatchQueue.main.async { [weak self] in
      self?.sendEvent(withName: "onAngleUpdate", body: [
        "angle": Int(riseSnap * 100),
        "rise":  riseSnap,
        "phase": phaseStr,
      ])
    }
  }

  /// Returns hipY − shoulderY using the highest-confidence shoulder-hip pair.
  /// Falls back to neck when shoulder confidence is below threshold — common when lying flat,
  /// where Vision's body pose model struggles with the inverted body orientation.
  private func shoulderHipRise(_ obs: VNHumanBodyPoseObservation) -> Double? {
    let ls = try? obs.recognizedPoint(.leftShoulder)
    let lh = try? obs.recognizedPoint(.leftHip)
    let rs = try? obs.recognizedPoint(.rightShoulder)
    let rh = try? obs.recognizedPoint(.rightHip)

    let leftOK  = (ls?.confidence ?? 0) > 0.25 && (lh?.confidence ?? 0) > 0.25
    let rightOK = (rs?.confidence ?? 0) > 0.25 && (rh?.confidence ?? 0) > 0.25

    if leftOK || rightOK {
      let s: VNRecognizedPoint
      let h: VNRecognizedPoint
      if leftOK && rightOK {
        if ls!.confidence >= rs!.confidence { s = ls!; h = lh! } else { s = rs!; h = rh! }
      } else if leftOK { s = ls!; h = lh! }
      else              { s = rs!; h = rh! }
      return Double(h.location.y) - Double(s.location.y)
    }

    // Neck fallback — neck landmark is more robust when lying flat
    if let neck = try? obs.recognizedPoint(.neck), neck.confidence > 0.2 {
      let bestHip: VNRecognizedPoint?
      if (lh?.confidence ?? 0) >= (rh?.confidence ?? 0) { bestHip = lh } else { bestHip = rh }
      if let hip = bestHip, hip.confidence > 0.2 {
        return Double(hip.location.y) - Double(neck.location.y)
      }
    }

    return nil
  }

  // MARK: - Calibration helpers

  /// Track a rep during calibration using a lightweight phase state machine.
  /// Uses the default thresholds to detect reps — calibration just records the metric range.
  private func trackCalibrationRep(isDown: Bool, isUp: Bool) {
    switch calibLastPhase {
    case .unknown:
      calibLastPhase = isDown ? .down : (isUp ? .up : .unknown)
    case .down:
      if isUp { calibLastPhase = .up }
    case .up:
      if isDown {
        calibLastPhase = .down
        calibRepCount += 1
        let observed = calibRepCount
        let needed   = calibrationRepsNeeded
        DispatchQueue.main.async { [weak self] in
          self?.sendEvent(withName: "onCalibrationProgress", body: [
            "repsObserved": observed,
            "totalNeeded":  needed,
          ])
        }
        if calibRepCount >= calibrationRepsNeeded {
          finaliseCalibration()
        }
      }
    }
  }

  private func finaliseCalibration() {
    let range = calibObservedMax - calibObservedMin
    guard range > 0.03 else {
      // Insufficient movement detected — exit calibration silently and keep defaults
      calibrationMode = false
      return
    }

    let enterUp: Double
    let exitUp:  Double

    switch exerciseMode {
    case .situp:
      // 70% of range = enter .up; 20% of range = exit .up (return to flat)
      enterUp  = calibObservedMin + range * 0.70
      exitUp   = calibObservedMin + range * 0.20
      suEnterUp = enterUp
      suExitUp  = exitUp
    case .pushup:
      // calibObservedMin = lowest elbow angle (bottom); calibObservedMax = highest (top)
      // 75% of range = "definitely up"; 25% of range = "definitely down"
      enterUp    = calibObservedMin + range * 0.75
      exitUp     = calibObservedMin + range * 0.25
      calibPuUp   = enterUp
      calibPuDown = exitUp
    case .squat:
      calibrationMode = false
      return
    }

    calibrationMode = false
    phase = exerciseMode == .situp ? .down : .unknown

    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.sendEvent(withName: "onCalibrationComplete", body: [
        "enterUp":  enterUp,
        "exitUp":   exitUp,
        "rangeMin": self.calibObservedMin,
        "rangeMax": self.calibObservedMax,
      ])
    }
  }

  // MARK: - Emit helpers

  private func emitRep(_ count: Int) {
    DispatchQueue.main.async { [weak self] in
      self?.sendEvent(withName: "onRepCounted", body: ["count": count, "flash": true])
    }
  }

  private func emitAngle(_ angle: Int) {
    DispatchQueue.main.async { [weak self] in
      self?.sendEvent(withName: "onAngleUpdate", body: ["angle": angle])
    }
  }

  private func emitPersonLost() {
    DispatchQueue.main.async { [weak self] in
      self?.sendEvent(withName: "onPersonLost", body: [:])
    }
  }
}
