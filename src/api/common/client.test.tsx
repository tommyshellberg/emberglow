import { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { signOut } from '@/lib/auth';
import { getToken } from '@/lib/auth/utils';
import { getItem } from '@/lib/storage';

import { refreshAccessToken } from '../auth';
// Import after mocks are set up
import { __resetRefreshAttempts, apiClient } from './client';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/auth/utils');
jest.mock('../auth');
jest.mock('@/lib/storage');

// Mock the token refresh error handler
jest.mock('@/lib/hooks/use-token-refresh-error-handler', () => ({
  handleTokenRefreshExhaustion: jest.fn(),
}));

// We'll capture the interceptors when the module loads
let requestInterceptor: {
  onFulfilled: (
    config: InternalAxiosRequestConfig
  ) => InternalAxiosRequestConfig;
  onRejected: (error: any) => Promise<any>;
};
let responseInterceptor: {
  onFulfilled: (response: any) => any;
  onRejected: (error: AxiosError) => Promise<any>;
};

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => {
    const instance = {
      interceptors: {
        request: {
          use: jest.fn((onFulfilled, onRejected) => {
            requestInterceptor = { onFulfilled, onRejected };
            return 1;
          }),
        },
        response: {
          use: jest.fn((onFulfilled, onRejected) => {
            responseInterceptor = { onFulfilled, onRejected };
            return 1;
          }),
        },
      },
      defaults: {
        baseURL: 'https://api.test.com',
        headers: { 'Content-Type': 'application/json' },
      },
    };

    // Make instance callable for retry logic
    return Object.assign(
      jest
        .fn()
        .mockImplementation((config) =>
          Promise.resolve({ data: 'retry success', config })
        ),
      instance
    );
  }),
}));

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

describe('apiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks clears calls but NOT implementations, so a
    // mockImplementation set in one test would leak into the next. Every test
    // starts from "no provisional data"; tests that need it re-mock locally.
    (getItem as jest.Mock).mockReturnValue(null);
    // Reset refresh attempts counter for each test
    __resetRefreshAttempts();
  });

  describe('request interceptor', () => {
    it('should add authorization header when token exists', () => {
      const mockToken = {
        access: 'test-access-token',
        refresh: 'test-refresh-token',
      };
      (getToken as jest.Mock).mockReturnValue(mockToken);

      const config: InternalAxiosRequestConfig = {
        headers: {} as any,
        method: 'get',
        url: '/test',
      };

      const result = requestInterceptor.onFulfilled(config);

      expect(result.headers.Authorization).toBe('Bearer test-access-token');
    });

    it('should not add authorization header when no token exists', () => {
      (getToken as jest.Mock).mockReturnValue(null);

      const config: InternalAxiosRequestConfig = {
        headers: {} as any,
        method: 'get',
        url: '/test',
      };

      const result = requestInterceptor.onFulfilled(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should fall back to the provisional access token when no full token exists', () => {
      (getToken as jest.Mock).mockReturnValue(null);
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalAccessToken' ? 'provisional-access-token' : null
      );

      const config: InternalAxiosRequestConfig = {
        headers: {} as any,
        method: 'get',
        url: '/users/me',
      };

      const result = requestInterceptor.onFulfilled(config);

      expect(result.headers.Authorization).toBe(
        'Bearer provisional-access-token'
      );
    });

    it('should prefer the full-account token when both tokens exist', () => {
      // Mid-conversion window: socialSignIn/verifyMagicLink store the real
      // tokens BEFORE clearing the provisional keys, so both briefly coexist.
      (getToken as jest.Mock).mockReturnValue({
        access: 'full-access-token',
        refresh: 'full-refresh-token',
      });
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalAccessToken' ? 'provisional-access-token' : null
      );

      const config: InternalAxiosRequestConfig = {
        headers: {} as any,
        method: 'get',
        url: '/users/me',
      };

      const result = requestInterceptor.onFulfilled(config);

      expect(result.headers.Authorization).toBe('Bearer full-access-token');
    });

    it('should handle request errors', async () => {
      const error = new Error('Request error');
      await expect(requestInterceptor.onRejected(error)).rejects.toThrow(
        'Request error'
      );
    });
  });

  describe('response interceptor', () => {
    it('should pass through successful responses', () => {
      const response = {
        data: 'success',
        status: 200,
        config: { url: '/api/test' },
      };
      const result = responseInterceptor.onFulfilled(response);
      expect(result).toEqual(response);
    });

    it('should handle errors without response', async () => {
      const error = new Error('Network error') as AxiosError;
      await expect(responseInterceptor.onRejected(error)).rejects.toThrow(
        'Network error'
      );
      expect(console.error).toHaveBeenCalledWith(
        'Axios error without response or config:',
        error
      );
    });

    it('should handle errors without config', async () => {
      const error = {
        response: { status: 500, data: 'Server error' },
      } as AxiosError;
      await expect(responseInterceptor.onRejected(error)).rejects.toEqual(
        error
      );
    });

    it('should pass through non-401 errors', async () => {
      const error = {
        response: { status: 400, data: 'Bad request' },
        config: { url: '/test' },
      } as AxiosError;
      await expect(responseInterceptor.onRejected(error)).rejects.toEqual(
        error
      );
    });

    describe('401 error handling', () => {
      it('should refresh token and retry request on first 401', async () => {
        const mockNewTokens = {
          access: { token: 'new-access-token', expires: '2025-01-01' },
          refresh: { token: 'new-refresh-token', expires: '2025-02-01' },
        };
        (refreshAccessToken as jest.Mock).mockResolvedValue(mockNewTokens);

        const originalConfig = {
          url: '/test',
          headers: { Authorization: 'Bearer old-token' },
        } as any;

        const error = {
          response: { status: 401 },
          config: originalConfig,
        } as AxiosError;

        const result = await responseInterceptor.onRejected(error);

        expect(refreshAccessToken).toHaveBeenCalled();
        expect(originalConfig.headers.Authorization).toBe(
          'Bearer new-access-token'
        );
        expect(originalConfig._retry).toBe(true);
        expect(result).toEqual({
          data: 'retry success',
          config: originalConfig,
        });
      });

      it('should not retry if request already has _retry flag', async () => {
        const originalConfig = {
          url: '/test',
          headers: { Authorization: 'Bearer old-token' },
          _retry: true,
        } as any;

        const error = {
          response: { status: 401 },
          config: originalConfig,
        } as AxiosError;

        await expect(responseInterceptor.onRejected(error)).rejects.toEqual(
          error
        );
        expect(refreshAccessToken).not.toHaveBeenCalled();
      });

      it('should sign out when refresh fails', async () => {
        (refreshAccessToken as jest.Mock).mockRejectedValue(
          new Error('Refresh failed')
        );

        const originalConfig = {
          url: '/test',
          headers: { Authorization: 'Bearer old-token' },
        } as any;

        const error = {
          response: { status: 401 },
          config: originalConfig,
        } as AxiosError;

        await expect(responseInterceptor.onRejected(error)).rejects.toThrow(
          'Refresh failed'
        );
        expect(signOut).toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith(
          'Token refresh failed catastrophically:',
          expect.any(Error)
        );
      });

      it('should sign out when refresh returns no token', async () => {
        (refreshAccessToken as jest.Mock).mockResolvedValue(null);

        const originalConfig = {
          url: '/test',
          headers: { Authorization: 'Bearer old-token' },
        } as any;

        const error = {
          response: { status: 401 },
          config: originalConfig,
        } as AxiosError;

        await expect(responseInterceptor.onRejected(error)).rejects.toThrow(
          'Token refresh failed: No new access token string received.'
        );
        expect(signOut).toHaveBeenCalled();
      });

      it('should sign out when refresh returns invalid token structure', async () => {
        (refreshAccessToken as jest.Mock).mockResolvedValue({
          access: {}, // Missing token property
          refresh: { token: 'refresh-token' },
        });

        const originalConfig = {
          url: '/test',
          headers: { Authorization: 'Bearer old-token' },
        } as any;

        const error = {
          response: { status: 401 },
          config: originalConfig,
        } as AxiosError;

        await expect(responseInterceptor.onRejected(error)).rejects.toThrow(
          'Token refresh failed: No new access token string received.'
        );
        expect(signOut).toHaveBeenCalled();
      });

      it('should process queue correctly', async () => {
        // Test the queue behavior by calling the interceptor twice rapidly
        const mockNewTokens = {
          access: { token: 'new-access-token', expires: '2025-01-01' },
          refresh: { token: 'new-refresh-token', expires: '2025-02-01' },
        };

        let refreshResolve: (value: any) => void;
        const refreshPromise = new Promise((resolve) => {
          refreshResolve = resolve;
        });
        (refreshAccessToken as jest.Mock).mockReturnValue(refreshPromise);

        const config1 = {
          url: '/test1',
          headers: { Authorization: 'Bearer old-token' },
        } as any;

        const config2 = {
          url: '/test2',
          headers: { Authorization: 'Bearer old-token' },
        } as any;

        const error1 = {
          response: { status: 401 },
          config: config1,
        } as AxiosError;

        const error2 = {
          response: { status: 401 },
          config: config2,
        } as AxiosError;

        // Start both requests
        const promise1 = responseInterceptor.onRejected(error1);
        const promise2 = responseInterceptor.onRejected(error2);

        // Only one refresh should be triggered
        expect(refreshAccessToken).toHaveBeenCalledTimes(1);

        // Resolve the refresh
        refreshResolve!(mockNewTokens);

        // Both should succeed
        const [result1, result2] = await Promise.all([promise1, promise2]);

        expect(config1.headers.Authorization).toBe('Bearer new-access-token');
        expect(config2.headers.Authorization).toBe('Bearer new-access-token');
        expect(result1).toBeDefined();
        expect(result2).toBeDefined();
      });

      it('should handle queue rejection', async () => {
        let refreshReject: (reason: any) => void;
        const refreshPromise = new Promise((_, reject) => {
          refreshReject = reject;
        });
        (refreshAccessToken as jest.Mock).mockReturnValue(refreshPromise);

        const config1 = {
          url: '/test1',
          headers: { Authorization: 'Bearer old-token' },
        } as any;

        const error1 = {
          response: { status: 401 },
          config: config1,
        } as AxiosError;

        const promise1 = responseInterceptor.onRejected(error1);

        // Reject the refresh
        const refreshError = new Error('Refresh failed');
        refreshReject!(refreshError);

        await expect(promise1).rejects.toThrow('Refresh failed');
        expect(signOut).toHaveBeenCalled();
      });

      describe('provisional users', () => {
        // MAX_REFRESH_ATTEMPTS in client.tsx. Not exported, so it is duplicated
        // here; if it changes, this helper stops exhausting and the tests below
        // start asserting against the ordinary refresh path instead.
        const MAX_REFRESH_ATTEMPTS = 3;

        // Burn the refresh budget so the NEXT 401 takes the exhaustion branch.
        const exhaustRefreshBudget = async () => {
          (refreshAccessToken as jest.Mock).mockRejectedValue(
            new Error('Refresh failed')
          );
          for (let i = 0; i < MAX_REFRESH_ATTEMPTS; i++) {
            await expect(
              responseInterceptor.onRejected({
                response: { status: 401 },
                // A fresh url each time: `_retry` is set on the config object,
                // so reusing one would short-circuit on the second pass.
                config: { url: `/burn-${i}`, headers: {} },
              } as AxiosError)
            ).rejects.toThrow('Refresh failed');
          }
        };

        const provisionalStorage = (key: string) =>
          key === 'provisionalAccessToken' ? 'provisional-access-token' : null;

        // These two tests discriminate on WHAT the interceptor rejects with,
        // not on whether handleTokenRefreshExhaustion ran, because that handler
        // can never run under Jest: client.tsx reaches it through a dynamic
        // `import()`, which throws ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG
        // without --experimental-vm-modules, and the `.catch(console.error)`
        // chained to it swallows the failure. Asserting on the handler would be
        // vacuous in both directions. Metro bundles dynamic import fine, so the
        // production escalation is unaffected — see SHE ticket.
        //
        // The rejections are mutually exclusive by construction: the provisional
        // path rejects the ORIGINAL axios error, the authenticated path rejects a
        // NEW TOKEN_REFRESH_EXHAUSTED error. So a guard that never fires fails the
        // first test and a guard that always fires fails the second.
        it('rejects a provisional user with the underlying 401 instead of escalating', async () => {
          (getItem as jest.Mock).mockImplementation(provisionalStorage);
          await exhaustRefreshBudget();

          const original = {
            response: { status: 401 },
            config: { url: '/users/premium-status', headers: {} },
          } as AxiosError;

          // toBe, not toEqual: identity is what proves the guard returned early
          // rather than constructing its own error.
          await expect(
            responseInterceptor.onRejected(original)
          ).rejects.toBe(original);

          // The escalation would end in a `cancelable: false` alert whose only
          // button calls signOut(), clearing the provisional keys and destroying
          // an unclaimed hero — while the provisional token is still valid.
          expect(signOut).not.toHaveBeenCalled();
        });

        it('still escalates exhausted refreshes for a fully authenticated user', async () => {
          // No provisional token: this is the path the alert exists for.
          (getItem as jest.Mock).mockReturnValue(null);
          await exhaustRefreshBudget();

          const original = {
            response: { status: 401 },
            config: { url: '/users/premium-status', headers: {} },
          } as AxiosError;

          await expect(
            responseInterceptor.onRejected(original)
          ).rejects.toMatchObject({ code: 'TOKEN_REFRESH_EXHAUSTED' });
        });

        it('does not sign out a provisional user when the refresh itself fails', async () => {
          // Guards the existing check at client.tsx:196-219. The neighbouring
          // "should sign out when refresh fails" tests never mock getItem, so
          // they pass off the undefined fallback and would keep passing if that
          // check were deleted.
          (getItem as jest.Mock).mockImplementation(provisionalStorage);
          (refreshAccessToken as jest.Mock).mockRejectedValue(
            new Error('Refresh failed')
          );

          await expect(
            responseInterceptor.onRejected({
              response: { status: 401 },
              config: { url: '/test', headers: {} },
            } as AxiosError)
          ).rejects.toThrow('Refresh failed');

          expect(signOut).not.toHaveBeenCalled();
        });

        it('does not sign out a provisional user when the refresh returns no token', async () => {
          // The sibling branch to the one above: refreshAccessToken resolves,
          // but without an access token. Its guard (client.tsx:229) was
          // separately unproven — mutating it to always sign out failed no test
          // until this one existed.
          (getItem as jest.Mock).mockImplementation(provisionalStorage);
          (refreshAccessToken as jest.Mock).mockResolvedValue(null);

          await expect(
            responseInterceptor.onRejected({
              response: { status: 401 },
              config: { url: '/test', headers: {} },
            } as AxiosError)
          ).rejects.toThrow(
            'Token refresh failed: No new access token string received.'
          );

          expect(signOut).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('exported apiClient', () => {
    it('should export the configured axios instance', () => {
      expect(apiClient).toBeDefined();
      expect(apiClient.interceptors).toBeDefined();
      expect(apiClient.defaults.baseURL).toBe('https://api.test.com');
      expect(apiClient.defaults.headers['Content-Type']).toBe(
        'application/json'
      );
    });
  });
});
