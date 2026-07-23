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

describe('secure-token-storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    secureStore.__store.clear();
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
        JSON.stringify(legacyValue)
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
  });

  describe('setItem', () => {
    it('stores the value in SecureStore and never writes it to MMKV', () => {
      const value: TestToken = { access: 'a', refresh: 'r' };

      setItem<TestToken>(TEST_KEY, value);

      expect(secureStore.setItem).toHaveBeenCalledWith(
        TEST_KEY,
        JSON.stringify(value)
      );
      expect(setMMKVItem).not.toHaveBeenCalled();

      // Confirms SecureStore genuinely holds it (not just that the mock was
      // called), and that MMKV never receives a plaintext copy.
      expect(getItem<TestToken>(TEST_KEY)).toEqual(value);
      expect(getMMKVItem).not.toHaveBeenCalled();
    });
  });

  describe('removeItem', () => {
    it('clears both SecureStore and any legacy MMKV copy', () => {
      secureStore.__store.set(TEST_KEY, JSON.stringify({ access: 'a' }));

      removeItem(TEST_KEY);

      expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(TEST_KEY);
      expect(removeMMKVItem).toHaveBeenCalledWith(TEST_KEY);
    });
  });
});
