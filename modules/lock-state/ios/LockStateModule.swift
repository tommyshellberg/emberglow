import ExpoModulesCore
import UIKit

public class LockStateModule: Module {
  private var backgroundObserver: NSObjectProtocol?
  private var foregroundObserver: NSObjectProtocol?
  private var didEnterBackgroundObserver: NSObjectProtocol?
  private var willEnterForegroundObserver: NSObjectProtocol?

  // While a presence session is active (JS toggles this), every app-background
  // transition holds a background task so the process survives long enough to
  // observe the protected-data lock signal — iOS engages data protection up to
  // ~10s AFTER the physical lock, by which time an unassisted app is already
  // suspended and the LOCKED event would be lost (the "hero in danger on lock"
  // bug). The ~30s task also gives the resulting lock PATCH time to complete.
  private var keepAliveEnabled = false
  private var keepAliveTask: UIBackgroundTaskIdentifier = .invalid

  public func definition() -> ModuleDefinition {
    Name("LockState")

    Events("LOCKED", "UNLOCKED")

    Function("setKeepAliveEnabled") { (enabled: Bool) in
      DispatchQueue.main.async {
        self.keepAliveEnabled = enabled
        if !enabled {
          self.endKeepAliveTask()
        }
      }
    }

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

      self.didEnterBackgroundObserver = NotificationCenter.default.addObserver(
        forName: UIApplication.didEnterBackgroundNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.beginKeepAliveTask()
      }

      self.willEnterForegroundObserver = NotificationCenter.default.addObserver(
        forName: UIApplication.willEnterForegroundNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.endKeepAliveTask()
      }
    }

    OnDestroy {
      for observer in [
        self.backgroundObserver,
        self.foregroundObserver,
        self.didEnterBackgroundObserver,
        self.willEnterForegroundObserver,
      ] {
        if let observer {
          NotificationCenter.default.removeObserver(observer)
        }
      }
      self.backgroundObserver = nil
      self.foregroundObserver = nil
      self.didEnterBackgroundObserver = nil
      self.willEnterForegroundObserver = nil
      self.endKeepAliveTask()
    }
  }

  private func beginKeepAliveTask() {
    guard keepAliveEnabled, keepAliveTask == .invalid else { return }
    keepAliveTask = UIApplication.shared.beginBackgroundTask(withName: "LockStateKeepAlive") {
      [weak self] in
      // Expiration: iOS reclaims the window (~30s). Release the token so the
      // suspend proceeds cleanly; by now the lock signal either arrived or
      // never will.
      self?.endKeepAliveTask()
    }
  }

  private func endKeepAliveTask() {
    guard keepAliveTask != .invalid else { return }
    UIApplication.shared.endBackgroundTask(keepAliveTask)
    keepAliveTask = .invalid
  }
}
