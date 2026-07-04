import ExpoModulesCore
import UIKit

public class LockStateModule: Module {
  private var backgroundObserver: NSObjectProtocol?
  private var foregroundObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("LockState")

    Events("LOCKED", "UNLOCKED")

    OnCreate {
      // True device-lock detection via protected-data availability. When the
      // device locks, iOS makes file-protected data unavailable; unlocking
      // makes it available again. This is a real lock signal, unlike the
      // background/foreground lifecycle proxy it replaces (which fired on any
      // app switch). Known, accepted limitation: passcode-less devices never
      // toggle protected-data availability, so their lock reads as "away".
      self.backgroundObserver = NotificationCenter.default.addObserver(
        forName: UIApplication.protectedDataWillBecomeUnavailableNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.sendEvent("LOCKED", ["reason": "Protected data unavailable (device locked)"])
      }

      self.foregroundObserver = NotificationCenter.default.addObserver(
        forName: UIApplication.protectedDataDidBecomeAvailableNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.sendEvent("UNLOCKED", ["reason": "Protected data available (device unlocked)"])
      }
    }

    OnDestroy {
      if let bgObs = self.backgroundObserver {
        NotificationCenter.default.removeObserver(bgObs)
        self.backgroundObserver = nil
      }
      if let fgObs = self.foregroundObserver {
        NotificationCenter.default.removeObserver(fgObs)
        self.foregroundObserver = nil
      }
    }
  }
}
