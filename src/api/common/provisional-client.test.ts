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

// Mock the provisional token accessor
const mockGetProvisionalAccessToken = jest.fn();
jest.mock('@/api/token', () => ({
  getProvisionalAccessToken: mockGetProvisionalAccessToken,
}));

// Mock axios
const mockAxiosInstance = {
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
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
}));

describe('Provisional API Client', () => {
  let provisionalApiClient: any;
  let requestInterceptor: any;
  let responseInterceptor: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup interceptor capture
    mockAxiosInstance.interceptors.request.use.mockImplementation(
      (success, _error) => {
        requestInterceptor = success;
        return success;
      }
    );

    mockAxiosInstance.interceptors.response.use.mockImplementation(
      (success, _error) => {
        responseInterceptor = success;
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
      mockGetProvisionalAccessToken.mockReturnValue('test-provisional-token');

      const config = {
        headers: {},
        url: '/test',
        method: 'GET',
      };

      const result = await requestInterceptor(config);

      expect(mockGetProvisionalAccessToken).toHaveBeenCalled();
      expect(result.headers.Authorization).toBe(
        'Bearer test-provisional-token'
      );
    });

    it('should not attach authorization header when no token exists', async () => {
      mockGetProvisionalAccessToken.mockReturnValue(null);

      const config = {
        headers: {},
        url: '/test',
        method: 'GET',
      };

      const result = await requestInterceptor(config);

      expect(mockGetProvisionalAccessToken).toHaveBeenCalled();
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should log invitation-related requests', async () => {
      mockGetProvisionalAccessToken.mockReturnValue('test-token');

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
      mockGetProvisionalAccessToken.mockReturnValue('test-token');

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
      mockGetProvisionalAccessToken.mockReturnValue('test-token');

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

  describe('Edge Cases', () => {
    it('should handle config with undefined URL in request interceptor', async () => {
      mockGetProvisionalAccessToken.mockReturnValue('test-token');

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
      mockGetProvisionalAccessToken.mockReturnValue('test-token');

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
      mockGetProvisionalAccessToken.mockReturnValue('');

      const config = {
        headers: {},
        url: '/test',
        method: 'GET',
      };

      const result = await requestInterceptor(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should handle storage that throws an error', async () => {
      mockGetProvisionalAccessToken.mockImplementation(() => {
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
