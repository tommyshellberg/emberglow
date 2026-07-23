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
 *
 * iOS Keychain access:
 * SecureStore defaults to `keychainAccessible: WHEN_UNLOCKED`, under which
 * Keychain reads AND writes throw while the device is locked. This app reads
 * tokens while locked as a core flow (quest timer lock-status sync, the
 * axios interceptor's getToken, navigation-state-resolver reads during
 * render, websocket-service connect), so every SecureStore call here passes
 * `AFTER_FIRST_UNLOCK` instead — the item stays accessible once the device
 * has been unlocked once since boot, including while subsequently locked.
 * Accessibility is really only a write-time attribute (it's fixed on the
 * Keychain item at write time), but we pass the same options object to every
 * call the installed types accept it on (setItem, getItem, deleteItemAsync)
 * for consistency; it's inert on reads/deletes. We don't use
 * `keychainService`, so there's no read/write mismatch risk from that
 * option.
 *
 * Because a locked keychain now throws instead of silently returning
 * plaintext (as MMKV did), every SecureStore call is wrapped so a throw
 * degrades to the in-memory cache below instead of propagating or being
 * mistaken for "no value" (signed-out).
 */

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// Last-known-good values, keyed the same as SecureStore. Populated on every
// successful read (including a migration read) and on every setItem call
// (even when the underlying SecureStore write throws, so the in-memory
// session keeps working). Cleared per-key at the start of removeItem so a
// removed token can never be served back out of the cache.
const cache = new Map<string, unknown>();

export function getItem<T>(key: string): T | null {
  try {
    const secureValue = SecureStore.getItem(key, SECURE_STORE_OPTIONS);
    if (secureValue !== null) {
      const parsed = JSON.parse(secureValue) as T;
      cache.set(key, parsed);
      return parsed;
    }
  } catch (err) {
    console.warn('[secure-token-storage] failed to read', key, err);
    return cache.has(key) ? (cache.get(key) as T) : null;
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
  // Update the cache first so the value is available in-memory even if the
  // SecureStore write below throws (e.g. locked keychain).
  cache.set(key, value);
  try {
    SecureStore.setItem(key, JSON.stringify(value), SECURE_STORE_OPTIONS);
  } catch (err) {
    console.warn('[secure-token-storage] failed to write', key, err);
  }
  // Belt-and-suspenders: clear any lingering plaintext MMKV copy of this key
  // even if the lazy-migration read path above never ran for it.
  removeMMKVItem(key);
}

export function removeItem(key: string): void {
  // Clear the cache synchronously, before any async work, so a removed
  // token can never be resurrected by a subsequent locked-keychain read.
  cache.delete(key);
  // Fire-and-forget: deleteItemAsync is the only removal API SecureStore
  // exposes on this version; callers here run synchronously and don't need
  // to await it.
  SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS).catch((err) =>
    console.warn('[secure-token-storage] failed to delete', key, err)
  );
  // Also clear any legacy plaintext copy so it can't resurrect on a later
  // lazy-migration read.
  removeMMKVItem(key);
}
