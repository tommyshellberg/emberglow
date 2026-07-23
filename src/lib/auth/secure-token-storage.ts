import * as SecureStore from 'expo-secure-store';

import {
  getItem as getMMKVItem,
  removeItem as removeMMKVItem,
} from '@/lib/storage';

/**
 * Synchronous, keyed token storage backed by SecureStore (iOS Keychain /
 * Android Keystore), with a lazy migration off legacy plaintext MMKV.
 *
 * Consumers of auth tokens (axios interceptors, navigation-state-resolver,
 * the auth store) read synchronously and at high frequency, so every
 * operation here must stay sync and cheap: `getItem` costs one SecureStore
 * read, plus — only on a pre-migration install — a single MMKV read.
 *
 * expo-secure-store ~15 exposes sync `getItem`/`setItem` but only an async
 * `deleteItemAsync`; `removeItem` below fires that off without awaiting it.
 */
export function getItem<T>(key: string): T | null {
  const secureValue = SecureStore.getItem(key);
  if (secureValue !== null) {
    return JSON.parse(secureValue) as T;
  }

  // Pre-upgrade installs may still have this value sitting in plaintext
  // MMKV. Adopt it into SecureStore once, then stop looking in MMKV for it.
  // `getMMKVItem`'s real implementation only ever returns `T | null`, but an
  // unconfigured jest auto-mock of it defaults to returning `undefined` —
  // guard with `!= null` (not `!==`) so that case doesn't get treated as a
  // legitimate legacy value and JSON.stringify'd into SecureStore.
  const legacyValue = getMMKVItem<T>(key);
  if (legacyValue != null) {
    setItem(key, legacyValue);
    removeMMKVItem(key);
    return legacyValue;
  }

  return null;
}

export function setItem<T>(key: string, value: T): void {
  SecureStore.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  // Fire-and-forget: deleteItemAsync is the only removal API SecureStore
  // exposes on this version; callers here run synchronously and don't need
  // to await it.
  SecureStore.deleteItemAsync(key).catch(() => {});
  // Also clear any legacy plaintext copy so it can't resurrect on a later
  // lazy-migration read.
  removeMMKVItem(key);
}
