import UIKit
import AVFoundation

@objc(RepCounterView)
class RepCounterView: UIView {

  private var previewLayer: AVCaptureVideoPreviewLayer?

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer?.frame = bounds
  }

  func setSession(_ session: AVCaptureSession) {
    previewLayer?.removeFromSuperlayer()
    let layer = AVCaptureVideoPreviewLayer(session: session)
    layer.videoGravity = .resizeAspectFill
    layer.frame = bounds
    self.layer.insertSublayer(layer, at: 0)
    previewLayer = layer
  }
}
