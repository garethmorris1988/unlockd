import Foundation
import React

@objc(RepCounterViewManager)
class RepCounterViewManager: RCTViewManager {

  override func view() -> UIView! {
    return RepCounterView()
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
