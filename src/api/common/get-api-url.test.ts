/**
 * Tests for getApiUrl — the platform-aware API URL resolver.
 *
 * Branches under test:
 * 1. production/staging → always returns Env.API_URL
 * 2. development, Android emulator → 10.0.2.2 alias
 * 3. development, iOS simulator → localhost
 * 4. development, real device → Env.API_URL
 * 5. extractPortAndPath fallback when URL parsing fails
 *
 * jest.doMock (not jest.mock) is used inside helper functions so the mock
 * factories can legally close over test-local variables.
 */

/** Re-require getApiUrl with controlled environment/platform/device values. */
function loadGetApiUrl(opts: {
  APP_ENV: string;
  API_URL: string;
  platformOS: string;
  isRealDevice: boolean;
}): () => string {
  jest.resetModules();

  jest.doMock('@env', () => ({
    Env: { APP_ENV: opts.APP_ENV, API_URL: opts.API_URL },
  }));
  jest.doMock('react-native', () => ({
    Platform: { OS: opts.platformOS },
  }));
  jest.doMock('expo-device', () => ({
    isDevice: opts.isRealDevice,
  }));

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./get-api-url').getApiUrl;
}

afterEach(() => {
  jest.resetModules();
});

describe('getApiUrl', () => {
  describe('production environment', () => {
    it('returns API_URL directly without modification', () => {
      const getApiUrl = loadGetApiUrl({
        APP_ENV: 'production',
        API_URL: 'https://api.example.com/v1',
        platformOS: 'ios',
        isRealDevice: false,
      });
      expect(getApiUrl()).toBe('https://api.example.com/v1');
    });

    it('ignores platform when APP_ENV is production — Android emulator still gets prod URL', () => {
      const getApiUrl = loadGetApiUrl({
        APP_ENV: 'production',
        API_URL: 'https://prod.example.com/v1',
        platformOS: 'android',
        isRealDevice: false,
      });
      expect(getApiUrl()).toBe('https://prod.example.com/v1');
    });
  });

  describe('staging environment', () => {
    it('returns API_URL directly without modification', () => {
      const getApiUrl = loadGetApiUrl({
        APP_ENV: 'staging',
        API_URL: 'https://staging.example.com/v1',
        platformOS: 'ios',
        isRealDevice: false,
      });
      expect(getApiUrl()).toBe('https://staging.example.com/v1');
    });
  });

  describe('development environment — Android emulator', () => {
    it('uses 10.0.2.2 alias with correct port and path', () => {
      const getApiUrl = loadGetApiUrl({
        APP_ENV: 'development',
        API_URL: 'http://localhost:3001/v1',
        platformOS: 'android',
        isRealDevice: false,
      });
      expect(getApiUrl()).toBe('http://10.0.2.2:3001/v1');
    });

    it('preserves custom port from API_URL', () => {
      const getApiUrl = loadGetApiUrl({
        APP_ENV: 'development',
        API_URL: 'http://localhost:8080/api',
        platformOS: 'android',
        isRealDevice: false,
      });
      expect(getApiUrl()).toBe('http://10.0.2.2:8080/api');
    });
  });

  describe('development environment — iOS simulator', () => {
    it('uses localhost with correct port and path', () => {
      const getApiUrl = loadGetApiUrl({
        APP_ENV: 'development',
        API_URL: 'http://192.168.1.5:3001/v1',
        platformOS: 'ios',
        isRealDevice: false,
      });
      expect(getApiUrl()).toBe('http://localhost:3001/v1');
    });

    it('preserves nested path segments', () => {
      const getApiUrl = loadGetApiUrl({
        APP_ENV: 'development',
        API_URL: 'http://192.168.1.5:4000/api/v2',
        platformOS: 'ios',
        isRealDevice: false,
      });
      expect(getApiUrl()).toBe('http://localhost:4000/api/v2');
    });
  });

  describe('development environment — real device', () => {
    it('returns API_URL without remapping for iOS real device', () => {
      const apiUrl = 'http://192.168.1.5:3001/v1';
      const getApiUrl = loadGetApiUrl({
        APP_ENV: 'development',
        API_URL: apiUrl,
        platformOS: 'ios',
        isRealDevice: true,
      });
      expect(getApiUrl()).toBe(apiUrl);
    });

    it('returns API_URL without remapping for Android real device', () => {
      const apiUrl = 'http://192.168.1.5:3001/v1';
      const getApiUrl = loadGetApiUrl({
        APP_ENV: 'development',
        API_URL: apiUrl,
        platformOS: 'android',
        isRealDevice: true,
      });
      expect(getApiUrl()).toBe(apiUrl);
    });
  });

  describe('extractPortAndPath fallback — invalid API_URL', () => {
    it('falls back to port 3001 and path /v1 on Android emulator', () => {
      const getApiUrl = loadGetApiUrl({
        APP_ENV: 'development',
        API_URL: 'not-a-valid-url',
        platformOS: 'android',
        isRealDevice: false,
      });
      expect(getApiUrl()).toBe('http://10.0.2.2:3001/v1');
    });

    it('falls back to port 3001 and path /v1 on iOS simulator', () => {
      const getApiUrl = loadGetApiUrl({
        APP_ENV: 'development',
        API_URL: 'not-a-valid-url',
        platformOS: 'ios',
        isRealDevice: false,
      });
      expect(getApiUrl()).toBe('http://localhost:3001/v1');
    });
  });
});
