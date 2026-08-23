// modules/lock-state/LockStateModule.ts
import { EventEmitter, requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

/**
 * Define the shape of our events. `expo-modules-core`'s EventEmitter keys
 * this map by listener signature, not payload type — we send no payload
 * with LOCKED/UNLOCKED, so each listener takes no arguments.
 */
type LockStateEventMap = {
  LOCKED: () => void;
  UNLOCKED: () => void;
};

// Create a type for the event keys
export type LockStateEvent = keyof LockStateEventMap;

/**
 * The subscription type for removing listeners.
 * In older versions of React Native we might have `import type { EmitterSubscription }`
 * from 'react-native', but expo-modules-core doesn't export a built-in Subscription type,
 * so we define our own.
 */
export type EmitterSubscription = {
  remove: () => void;
};

// Load our "LockState" native module by its name from the Kotlin code: Name("LockState")
const LockState = requireNativeModule('LockState');

// Create a typed EventEmitter, associating our event names with possible payloads
const lockStateEmitter = new EventEmitter<LockStateEventMap>(LockState);

/**
 * While enabled, iOS holds a background task whenever the app is backgrounded,
 * keeping the process alive long enough (~30s) to observe the protected-data
 * lock signal — which lags the physical lock by ~10s, well past the point an
 * unassisted app is suspended — and to deliver the resulting lock PATCH.
 * Android is a no-op: its screen-off broadcast is instant and the quest
 * foreground service already keeps the process alive.
 */
export function setKeepAliveEnabled(enabled: boolean): void {
  if (Platform.OS !== 'ios') return;
  try {
    LockState.setKeepAliveEnabled(enabled);
  } catch (error) {
    // A dev-client binary built before this native function exists would
    // otherwise throw on every presence session start under Metro.
    console.warn('[LockState] setKeepAliveEnabled unavailable:', error);
  }
}

/**
 * Subscribe to device lock/unlock events from the native module.
 */
export function addLockListener(
  eventType: LockStateEvent,
  callback: () => void
): EmitterSubscription {
  // Add a listener for either "LOCKED" or "UNLOCKED"
  return lockStateEmitter.addListener(eventType, callback);
}

export default addLockListener;
