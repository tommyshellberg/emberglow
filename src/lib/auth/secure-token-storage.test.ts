import * as SecureStore from 'expo-secure-store';

import {
  getItem as getMMKVItem,
  removeItem as removeMMKVItem,
  setItem as setMMKVItem,
} from '@/lib/storage';

import { getItem, removeItem, setItem } from './secure-token-storage';

jest.mock('@/lib/storage');

// Mock expo-secure-store's sync API with a real in-memory map so tests can
// exercise genuine read-after-write behavior instead of canned return
// values. deleteItemAsync is the only removal primitive SecureStore
// exposes (no sync delete), so it stays async here too.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK: 1,
    getItem: jest.fn((key: string) => (store.has(key) ? store.get(key) : null)),
    setItem: jest.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    __store: store,
  };
});

const TEST_KEY = 'token';
type TestToken = { access: string; refresh: string };

const secureStore = SecureStore as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
  deleteItemAsync: jest.Mock;
  __store: Map<string, string>;
};

// The options object every SecureStore call should be invoked with, per the
// locked-keychain fix: WHEN_UNLOCKED (the library default) throws on reads
// and writes while the device is locked, and this app reads tokens while
// locked as a core flow.
const AFTER_FIRST_UNLOCK_OPTIONS = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

const LOCKED_KEYCHAIN_ERROR = new Error(
  'Could not decrypt the item in SecureStore (locked)'
);

describe('secure-token-storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    secureStore.__store.clear();
    (getMMKVItem as jest.Mock).mockReturnValue(null);
  });

  describe('getItem', () => {
    it('returns null on a fresh install (nothing in SecureStore or MMKV)', () => {
      (getMMKVItem as jest.Mock).mockReturnValue(null);

      const result = getItem<TestToken>(TEST_KEY);

      expect(result).toBeNull();
    });

    // Regression test: an unconfigured jest.mock('@/lib/storage') auto-mock
    // returns `undefined` by default (unlike the real getItem, which is
    // typed T | null and never returns undefined). `undefined !== null`, so
    // a naive strict-equality guard here previously treated that as "found a
    // legacy value," JSON.stringify'd it (producing the literal string
    // "undefined"), and wrote that into SecureStore — corrupting the key so
    // the next read crashed JSON.parse. Confirmed via src/api/common/client.test.tsx.
    it('treats an undefined MMKV read (unconfigured mock default) the same as null', () => {
      (getMMKVItem as jest.Mock).mockReturnValue(undefined);

      const result = getItem<TestToken>(TEST_KEY);

      expect(result).toBeNull();
      expect(secureStore.setItem).not.toHaveBeenCalled();
      expect(removeMMKVItem).not.toHaveBeenCalled();
    });

    it('reads a value already stored in SecureStore without touching MMKV', () => {
      const value: TestToken = { access: 'a', refresh: 'r' };
      secureStore.__store.set(TEST_KEY, JSON.stringify(value));

      const result = getItem<TestToken>(TEST_KEY);

      expect(result).toEqual(value);
      expect(getMMKVItem).not.toHaveBeenCalled();
    });

    it('migrates a legacy MMKV-only value: returns it, writes it to SecureStore, deletes the MMKV copy', () => {
      const legacyValue: TestToken = {
        access: 'legacy-a',
        refresh: 'legacy-r',
      };
      (getMMKVItem as jest.Mock).mockReturnValue(legacyValue);

      const result = getItem<TestToken>(TEST_KEY);

      expect(result).toEqual(legacyValue);
      expect(secureStore.setItem).toHaveBeenCalledWith(
        TEST_KEY,
        JSON.stringify(legacyValue),
        AFTER_FIRST_UNLOCK_OPTIONS
      );
      expect(removeMMKVItem).toHaveBeenCalledWith(TEST_KEY);
    });

    it('does not re-read MMKV once a value has been migrated into SecureStore', () => {
      const legacyValue: TestToken = {
        access: 'legacy-a',
        refresh: 'legacy-r',
      };
      (getMMKVItem as jest.Mock).mockReturnValue(legacyValue);

      getItem<TestToken>(TEST_KEY);
      getItem<TestToken>(TEST_KEY);

      expect(getMMKVItem).toHaveBeenCalledTimes(1);
    });

    // Locked-keychain fix: expo-secure-store defaults to
    // keychainAccessible: WHEN_UNLOCKED, under which Keychain reads throw
    // while the device is locked. Tokens are read while locked as a core
    // flow (quest timer lock-status sync, axios interceptor getToken,
    // navigation-state-resolver, websocket-service connect), so a throw
    // here must never propagate or be mistaken for "signed out."
    it('returns null (not a throw) when SecureStore.getItem throws and the key has never been cached', () => {
      const coldKey = 'never-cached-key';
      secureStore.getItem.mockImplementationOnce(() => {
        throw LOCKED_KEYCHAIN_ERROR;
      });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      let result: TestToken | null = null;
      expect(() => {
        result = getItem<TestToken>(coldKey);
      }).not.toThrow();

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[secure-token-storage]'),
        coldKey,
        LOCKED_KEYCHAIN_ERROR
      );
    });

    it('returns the cached value when SecureStore.getItem throws after a prior successful read', () => {
      const warmKey = 'warm-via-read-key';
      const value: TestToken = { access: 'a', refresh: 'r' };
      secureStore.__store.set(warmKey, JSON.stringify(value));
      // Prime the cache with one successful (non-throwing) read.
      expect(getItem<TestToken>(warmKey)).toEqual(value);

      secureStore.getItem.mockImplementationOnce(() => {
        throw LOCKED_KEYCHAIN_ERROR;
      });

      const result = getItem<TestToken>(warmKey);

      expect(result).toEqual(value);
    });

    it('prevents a removed key from being resurrected by the cache: getItem returns null after removeItem, even if SecureStore then throws', () => {
      const key = 'removed-then-locked-key';
      const value: TestToken = { access: 'a', refresh: 'r' };
      secureStore.__store.set(key, JSON.stringify(value));
      // Prime the cache.
      expect(getItem<TestToken>(key)).toEqual(value);

      removeItem(key);

      secureStore.getItem.mockImplementationOnce(() => {
        throw LOCKED_KEYCHAIN_ERROR;
      });

      const result = getItem<TestToken>(key);

      expect(result).toBeNull();
    });

    it('passes keychainAccessible: AFTER_FIRST_UNLOCK to SecureStore.getItem', () => {
      getItem<TestToken>(TEST_KEY);

      expect(secureStore.getItem).toHaveBeenCalledWith(
        TEST_KEY,
        AFTER_FIRST_UNLOCK_OPTIONS
      );
    });
  });

  describe('setItem', () => {
    it('stores the value in SecureStore and never writes it to MMKV', () => {
      const value: TestToken = { access: 'a', refresh: 'r' };

      setItem<TestToken>(TEST_KEY, value);

      expect(secureStore.setItem).toHaveBeenCalledWith(
        TEST_KEY,
        JSON.stringify(value),
        AFTER_FIRST_UNLOCK_OPTIONS
      );
      expect(setMMKVItem).not.toHaveBeenCalled();

      // Confirms SecureStore genuinely holds it (not just that the mock was
      // called), and that MMKV never receives a plaintext copy.
      expect(getItem<TestToken>(TEST_KEY)).toEqual(value);
      expect(getMMKVItem).not.toHaveBeenCalled();
    });

    it('passes keychainAccessible: AFTER_FIRST_UNLOCK in options (mock call args)', () => {
      setItem<TestToken>(TEST_KEY, { access: 'a', refresh: 'r' });

      expect(secureStore.setItem).toHaveBeenCalledWith(
        TEST_KEY,
        expect.any(String),
        { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }
      );
    });

    it('removes any legacy plaintext MMKV copy of the key, independent of the migration read path', () => {
      setItem<TestToken>(TEST_KEY, { access: 'a', refresh: 'r' });

      expect(removeMMKVItem).toHaveBeenCalledWith(TEST_KEY);
    });

    it('does not throw when SecureStore.setItem throws, and keeps the value in memory so a subsequent getItem serves it while the keychain remains inaccessible', () => {
      const key = 'set-fails-then-locked-key';
      const value: TestToken = { access: 'a', refresh: 'r' };
      secureStore.setItem.mockImplementationOnce(() => {
        throw LOCKED_KEYCHAIN_ERROR;
      });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => setItem<TestToken>(key, value)).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[secure-token-storage]'),
        key,
        LOCKED_KEYCHAIN_ERROR
      );

      // The real SecureStore write failed, so a genuinely unlocked read
      // would legitimately find nothing. Simulate the keychain still being
      // inaccessible on the very next read, the way it would be if the
      // device is still locked.
      secureStore.getItem.mockImplementationOnce(() => {
        throw LOCKED_KEYCHAIN_ERROR;
      });

      const result = getItem<TestToken>(key);

      expect(result).toEqual(value);
    });
  });

  describe('removeItem', () => {
    it('clears both SecureStore and any legacy MMKV copy', () => {
      secureStore.__store.set(TEST_KEY, JSON.stringify({ access: 'a' }));

      removeItem(TEST_KEY);

      expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
        TEST_KEY,
        AFTER_FIRST_UNLOCK_OPTIONS
      );
      expect(removeMMKVItem).toHaveBeenCalledWith(TEST_KEY);
    });

    it('logs (rather than throwing) when the underlying deleteItemAsync rejects', async () => {
      const key = 'delete-rejects-key';
      const deleteError = new Error('delete failed');
      secureStore.deleteItemAsync.mockImplementationOnce(() =>
        Promise.reject(deleteError)
      );
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => removeItem(key)).not.toThrow();
      // Let the fire-and-forget promise's rejection handler run.
      await Promise.resolve();
      await Promise.resolve();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed to delete'),
        key,
        deleteError
      );
    });

    it('clears the in-memory cache synchronously, before the async delete resolves', () => {
      const key = 'cache-clear-key';
      const value: TestToken = { access: 'a', refresh: 'r' };
      secureStore.__store.set(key, JSON.stringify(value));
      expect(getItem<TestToken>(key)).toEqual(value);

      // deleteItemAsync never resolves in this test — proving the cache is
      // cleared up front, not as a continuation of the async delete.
      secureStore.deleteItemAsync.mockImplementationOnce(
        () => new Promise(() => {})
      );

      removeItem(key);

      secureStore.getItem.mockImplementationOnce(() => {
        throw LOCKED_KEYCHAIN_ERROR;
      });

      expect(getItem<TestToken>(key)).toBeNull();
    });
  });
});
