import { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

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

// Mock queryClient singleton from api-provider (assigned inside factory,
// mirroring the interceptor-capture pattern used for axios below)
let mockInvalidateQueries: jest.Mock;
jest.mock('@/api/common/api-provider', () => {
  mockInvalidateQueries = jest.fn();
  return { queryClient: { invalidateQueries: mockInvalidateQueries } };
});

// Mock expo-router imperative router
let mockRouterReplace: jest.Mock;
jest.mock('expo-router', () => {
  mockRouterReplace = jest.fn();
  return { router: { replace: mockRouterReplace } };
});

// Capture the response interceptor when the module loads
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
          use: jest.fn(() => 1),
        },
        response: {
          use: jest.fn((_onFulfilled, onRejected) => {
            responseInterceptor = { onFulfilled: _onFulfilled, onRejected };
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

describe('apiClient spirit-faded backstop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRefreshAttempts();
  });

  it('invalidates user details and routes home on 403 SPIRIT_FADED', async () => {
    const error = {
      response: {
        status: 403,
        data: { errorCode: 'SPIRIT_FADED' },
      },
      config: { url: '/quests/start' } as any,
    } as AxiosError;

    await expect(responseInterceptor.onRejected(error)).rejects.toEqual(error);

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['user', 'details'],
    });
    expect(mockRouterReplace).toHaveBeenCalledWith('/(app)');
  });

  it('does not trigger spirit branch on 403 without SPIRIT_FADED errorCode', async () => {
    const error = {
      response: {
        status: 403,
        data: { errorCode: 'SOMETHING_ELSE' },
      },
      config: { url: '/quests/start' } as any,
    } as AxiosError;

    await expect(responseInterceptor.onRejected(error)).rejects.toEqual(error);

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('does not trigger spirit branch on 401 (refresh path handles it)', async () => {
    (refreshAccessToken as jest.Mock).mockResolvedValue({
      access: { token: 'new-access-token' },
      refresh: { token: 'new-refresh-token' },
    });

    const originalConfig = {
      url: '/quests/start',
      headers: { Authorization: 'Bearer old-token' },
    } as any as InternalAxiosRequestConfig;

    const error = {
      response: { status: 401 },
      config: originalConfig,
    } as AxiosError;

    await responseInterceptor.onRejected(error);

    // Spirit backstop must NOT fire on 401
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
    // Refresh path should have run
    expect(refreshAccessToken).toHaveBeenCalled();
  });

  it('still exports the configured axios instance', () => {
    expect(apiClient).toBeDefined();
    expect(apiClient.interceptors).toBeDefined();
  });
});
