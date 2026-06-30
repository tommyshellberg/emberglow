// modules/lock-state/LockStateModule.ts
import { EventEmitter, requireNativeModule } from 'expo-modules-core';

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
