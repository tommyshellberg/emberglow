/**
 * Manual Jest mock for expo-secure-store.
 *
 * jest-expo only auto-mocks native modules that ship a `mocks/` directory
 * inside their own package or that appear in its built-in moduleMocks list
 * (see the expo-audio manual mock in this same directory for the same
 * situation). expo-secure-store has neither, so the real native binding
 * leaks through in tests that don't explicitly mock it — its sync `getItem`
 * then returns something that isn't valid JSON (observed:
 * `"[object Promise]"`), which crashes any caller that JSON.parses the
 * result (see src/lib/auth/secure-token-storage.ts).
 *
 * Backed by a real in-memory Map so callers get genuine read-after-write
 * behavior instead of canned return values. Tests that care about isolating
 * SecureStore state between cases should call `__resetSecureStoreMock()` in
 * `beforeEach` — `clearAllMocks()` clears call history but not the Map.
 */
const store = new Map<string, string>();

export const getItem = jest.fn((key: string): string | null =>
  store.has(key) ? store.get(key)! : null
);

export const setItem = jest.fn((key: string, value: string): void => {
  store.set(key, value);
});

export const getItemAsync = jest.fn(
  async (key: string): Promise<string | null> =>
    store.has(key) ? store.get(key)! : null
);

export const setItemAsync = jest.fn(
  async (key: string, value: string): Promise<void> => {
    store.set(key, value);
  }
);

export const deleteItemAsync = jest.fn(async (key: string): Promise<void> => {
  store.delete(key);
});

export const isAvailableAsync = jest.fn(async (): Promise<boolean> => true);

export const canUseBiometricAuthentication = jest.fn((): boolean => false);

export const __resetSecureStoreMock = () => {
  store.clear();
  getItem.mockClear();
  setItem.mockClear();
  getItemAsync.mockClear();
  setItemAsync.mockClear();
  deleteItemAsync.mockClear();
  isAvailableAsync.mockClear();
  canUseBiometricAuthentication.mockClear();
};
