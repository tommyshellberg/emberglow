// Mock environment variables
jest.mock('@env', () => ({
  Env: {
    API_URL: 'https://api.example.com',
  },
}));

// provisional-client derives its baseURL from getApiUrl() (platform-aware URL
// resolution lives there and is tested separately). Mock it so this test
// controls the baseURL deterministically regardless of platform/env.
jest.mock('./get-api-url', () => ({
  getApiUrl: jest.fn(() => 'https://api.example.com'),
}));

// Mock storage
const mockGetItem = jest.fn();
jest.mock('@/lib/storage', () => ({
  getItem: mockGetItem,
}));

// Mock the provisional refresh + dead-session recovery seams
const mockRefreshProvisionalTokens = jest.fn();
jest.mock('../auth', () => ({
  refreshProvisionalTokens: (...args: any[]) =>
    mockRefreshProvisionalTokens(...args),
}));

const mockEndProvisionalSession = jest.fn();
jest.mock('@/lib/auth', () => ({
  endProvisionalSession: (...args: any[]) => mockEndProvisionalSession(...args),
}));

// Mock axios — the instance must be CALLABLE: the 401 handler retries by
// invoking provisionalApiClient(originalRequest) directly.
const mockAxiosInstance = Object.assign(
  jest
    .fn()
    .mockImplementation((config) =>
      Promise.resolve({ data: 'retry success', config })
    ),
  {
    interceptors: {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }
);

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
}));

describe('Provisional API Client', () => {
  let provisionalApiClient: any;
  let requestInterceptor: any;
  let responseInterceptor: any;
  let responseErrorInterceptor: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks wipes calls but not implementations; restore the callable
    // retry behavior and pin the refresh default so tests can't leak into
    // each other.
    mockAxiosInstance.mockImplementation((config: any) =>
      Promise.resolve({ data: 'retry success', config })
    );
    mockRefreshProvisionalTokens.mockResolvedValue({ status: 'error' });

    // Setup interceptor capture
    mockAxiosInstance.interceptors.request.use.mockImplementation(
      (success, _error) => {
        requestInterceptor = success;
        return success;
      }
    );

    mockAxiosInstance.interceptors.response.use.mockImplementation(
      (success, error) => {
        responseInterceptor = success;
        responseErrorInterceptor = error;
        return success;
      }
    );

    // Reset console.log mock
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Re-import the module to get fresh setup
    jest.resetModules();
    ({ provisionalApiClient } = require('./provisional-client'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Client Configuration', () => {
    it('should create axios instance with correct configuration', () => {
      const axios = require('axios');

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.example.com',
        headers: {
          'Content-Type': 'application/json',
        },
        // No-timeout requests can pend forever once the OS drops the socket
        // (observed wedging completeQuest's reward fetch on a locked phone).
        timeout: 30000,
      });
    });

    it('should register request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('Request Interceptor', () => {
    it('should attach provisional token to request headers when token exists', async () => {
      mockGetItem.mockReturnValue('test-provisional-token');

      const config = {
        headers: {},
        url: '/test',
        method: 'GET',
      };

      const result = await requestInterceptor(config);

      expect(mockGetItem).toHaveBeenCalledWith('provisionalAccessToken');
      expect(result.headers.Authorization).toBe(
        'Bearer test-provisional-token'
      );
    });

    it('should not attach authorization header when no token exists', async () => {
      mockGetItem.mockReturnValue(null);

      const config = {
        headers: {},
        url: '/test',
        method: 'GET',
      };

      const result = await requestInterceptor(config);

      expect(mockGetItem).toHaveBeenCalledWith('provisionalAccessToken');
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should log invitation-related requests', async () => {
      mockGetItem.mockReturnValue('test-token');

      const config = {
        headers: {},
        url: '/invitations/send',
        method: 'post',
        data: { email: 'test@example.com' },
      };

      const consoleSpy = jest.spyOn(console, 'log');

      await requestInterceptor(config);

      expect(consoleSpy).toHaveBeenCalledWith(
        '========================================'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Provisional API Client] Invitation Request'
      );
      expect(consoleSpy).toHaveBeenCalledWith('Method:', 'POST');
      expect(consoleSpy).toHaveBeenCalledWith('URL:', '/invitations/send');
      expect(consoleSpy).toHaveBeenCalledWith('Data:', {
        email: 'test@example.com',
      });
      expect(consoleSpy).toHaveBeenCalledWith('Timestamp:', expect.any(String));
      expect(consoleSpy).toHaveBeenCalledWith(
        '========================================'
      );
    });

    it('should not log non-invitation requests', async () => {
      mockGetItem.mockReturnValue('test-token');

      const config = {
        headers: {},
        url: '/users/me',
        method: 'get',
      };

      const consoleSpy = jest.spyOn(console, 'log');

      await requestInterceptor(config);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        '[Provisional API Client] Invitation Request'
      );
    });

    it('should handle invitation URL patterns correctly', async () => {
      mockGetItem.mockReturnValue('test-token');

      const invitationUrls = [
        '/invitations/123',
        '/invitations/accept',
        '/invitations/decline',
        '/api/v1/invitations/send',
      ];

      const consoleSpy = jest.spyOn(console, 'log');

      for (const url of invitationUrls) {
        consoleSpy.mockClear();

        await requestInterceptor({
          headers: {},
          url,
          method: 'post',
        });

        expect(consoleSpy).toHaveBeenCalledWith(
          '[Provisional API Client] Invitation Request'
        );
      }
    });

    it('should handle request errors properly', async () => {
      const requestErrorHandler =
        mockAxiosInstance.interceptors.request.use.mock.calls[0][1];
      const error = new Error('Request configuration error');

      await expect(requestErrorHandler(error)).rejects.toThrow(
        'Request configuration error'
      );
    });
  });

  describe('Response Interceptor', () => {
    it('should log invitation-related responses', async () => {
      const response = {
        status: 200,
        config: {
          url: '/invitations/send',
        },
        data: { success: true, invitationId: '123' },
      };

      const consoleSpy = jest.spyOn(console, 'log');

      const result = await responseInterceptor(response);

      expect(consoleSpy).toHaveBeenCalledWith(
        '========================================'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Provisional API Client] Invitation Response'
      );
      expect(consoleSpy).toHaveBeenCalledWith('Status:', 200);
      expect(consoleSpy).toHaveBeenCalledWith('URL:', '/invitations/send');
      expect(consoleSpy).toHaveBeenCalledWith('Response Data:', {
        success: true,
        invitationId: '123',
      });
      expect(consoleSpy).toHaveBeenCalledWith('Timestamp:', expect.any(String));
      expect(consoleSpy).toHaveBeenCalledWith(
        '========================================'
      );
      expect(result).toBe(response);
    });

    it('should not log non-invitation responses', async () => {
      const response = {
        status: 200,
        config: {
          url: '/users/me',
        },
        data: { id: 1, name: 'Test User' },
      };

      const consoleSpy = jest.spyOn(console, 'log');

      const result = await responseInterceptor(response);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        '[Provisional API Client] Invitation Response'
      );
      expect(result).toBe(response);
    });

    it('should handle various invitation response URLs', async () => {
      const invitationUrls = [
        '/invitations/123',
        '/invitations/accept',
        '/invitations/decline',
        '/api/v1/invitations/send',
      ];

      const consoleSpy = jest.spyOn(console, 'log');

      for (const url of invitationUrls) {
        consoleSpy.mockClear();

        await responseInterceptor({
          status: 200,
          config: { url },
          data: { success: true },
        });

        expect(consoleSpy).toHaveBeenCalledWith(
          '[Provisional API Client] Invitation Response'
        );
      }
    });

    it('should handle response errors properly', async () => {
      const responseErrorHandler =
        mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      const error = new Error('Response error');

      await expect(responseErrorHandler(error)).rejects.toThrow(
        'Response error'
      );
    });

    it('should handle responses with different status codes', async () => {
      const statusCodes = [200, 201, 400, 401, 404, 500];
      const consoleSpy = jest.spyOn(console, 'log');

      for (const status of statusCodes) {
        consoleSpy.mockClear();

        await responseInterceptor({
          status,
          config: { url: '/invitations/test' },
          data: { message: `Response with status ${status}` },
        });

        expect(consoleSpy).toHaveBeenCalledWith('Status:', status);
      }
    });
  });

  describe('401 handling', () => {
    it('refreshes the provisional session and retries the request once', async () => {
      mockRefreshProvisionalTokens.mockResolvedValue({
        status: 'refreshed',
        tokens: {
          access: { token: 'rotated-access', expires: '2025-01-01' },
          refresh: { token: 'rotated-refresh', expires: '2025-02-01' },
        },
      });

      const originalRequest = { url: '/quest-runs', headers: {} } as any;
      const result = await responseErrorInterceptor({
        response: { status: 401 },
        config: originalRequest,
      });

      expect(mockRefreshProvisionalTokens).toHaveBeenCalled();
      expect(originalRequest.headers.Authorization).toBe(
        'Bearer rotated-access'
      );
      expect(originalRequest._retry).toBe(true);
      expect(result).toEqual({ data: 'retry success', config: originalRequest });
      expect(mockEndProvisionalSession).not.toHaveBeenCalled();
    });

    it('ends the provisional session when the refresh proves it dead', async () => {
      mockRefreshProvisionalTokens.mockResolvedValue({ status: 'dead' });

      const original = {
        response: { status: 401 },
        config: { url: '/quest-runs', headers: {} },
      };

      await expect(responseErrorInterceptor(original)).rejects.toBe(original);
      expect(mockEndProvisionalSession).toHaveBeenCalled();
    });

    it('keeps the session and rejects when the refresh merely errors', async () => {
      mockRefreshProvisionalTokens.mockResolvedValue({ status: 'error' });

      const original = {
        response: { status: 401 },
        config: { url: '/quest-runs', headers: {} },
      };

      await expect(responseErrorInterceptor(original)).rejects.toBe(original);
      expect(mockEndProvisionalSession).not.toHaveBeenCalled();
    });

    it('does not refresh twice for the same request', async () => {
      const original = {
        response: { status: 401 },
        config: { url: '/quest-runs', headers: {}, _retry: true },
      };

      await expect(responseErrorInterceptor(original)).rejects.toBe(original);
      expect(mockRefreshProvisionalTokens).not.toHaveBeenCalled();
    });

    it('passes non-401 errors through without refreshing', async () => {
      const original = {
        response: { status: 500 },
        config: { url: '/quest-runs', headers: {} },
      };

      await expect(responseErrorInterceptor(original)).rejects.toBe(original);
      expect(mockRefreshProvisionalTokens).not.toHaveBeenCalled();
      expect(mockEndProvisionalSession).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle config with undefined URL in request interceptor', async () => {
      mockGetItem.mockReturnValue('test-token');

      const config = {
        headers: {},
        url: undefined,
        method: 'GET',
      };

      const consoleSpy = jest.spyOn(console, 'log');

      const result = await requestInterceptor(config);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        '[Provisional API Client] Invitation Request'
      );
      expect(result).toBe(config);
    });

    it('should handle response with undefined URL in response interceptor', async () => {
      const response = {
        status: 200,
        config: {
          url: undefined,
        },
        data: { success: true },
      };

      const consoleSpy = jest.spyOn(console, 'log');

      const result = await responseInterceptor(response);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        '[Provisional API Client] Invitation Response'
      );
      expect(result).toBe(response);
    });

    it('should handle config with null method in request interceptor', async () => {
      mockGetItem.mockReturnValue('test-token');

      const config = {
        headers: {},
        url: '/invitations/send',
        method: null,
      };

      const consoleSpy = jest.spyOn(console, 'log');

      await requestInterceptor(config);

      expect(consoleSpy).toHaveBeenCalledWith('Method:', undefined);
    });

    it('should handle empty storage token', async () => {
      mockGetItem.mockReturnValue('');

      const config = {
        headers: {},
        url: '/test',
        method: 'GET',
      };

      const result = await requestInterceptor(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should handle storage that throws an error', async () => {
      mockGetItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const config = {
        headers: {},
        url: '/test',
        method: 'GET',
      };

      // Should throw the storage error
      expect(() => requestInterceptor(config)).toThrow('Storage error');
    });
  });

  describe('Module Export', () => {
    it('should export provisionalApiClient', () => {
      expect(provisionalApiClient).toBeDefined();
    });

    it('should export the same instance that was created', () => {
      // The client should be the return value of axios.create
      expect(provisionalApiClient).toBe(mockAxiosInstance);
    });
  });
});
