import { signIn } from '@/lib/auth';
import { posthogClient } from '@/lib/posthog';
import { getUserDetails } from '@/lib/services/user';
import { getItem, removeItem } from '@/lib/storage';
import { useUserStore } from '@/store/user-store';

import {
  authClient,
  completeSignIn,
  isAuthenticated,
  logout,
  refreshAccessToken,
  removeTokens,
  requestMagicLink,
  verifyMagicLink,
  verifyMagicLinkAndSignIn,
} from './auth';
import * as tokenService from './token';

// Mock dependencies
jest.mock('@/api/common/client');
jest.mock('@/lib/auth');
jest.mock('@/lib/services/user');
jest.mock('@/lib/storage');
jest.mock('@/store/user-store');
jest.mock('./token');
jest.mock('@env', () => ({
  Env: {
    API_URL: 'https://api.test.com',
  },
}));

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('auth.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authClient', () => {
    it('should be exported and configured', () => {
      expect(authClient).toBeDefined();
      expect(authClient.post).toBeDefined();
      expect(authClient.get).toBeDefined();
    });
  });

  describe('requestMagicLink', () => {
    beforeEach(() => {
      (authClient.post as jest.Mock).mockClear();
    });

    it('should send magic link request with email only when no provisional data', async () => {
      (getItem as jest.Mock).mockReturnValue(null);
      (authClient.post as jest.Mock).mockResolvedValue({ data: {} });

      await requestMagicLink('test@example.com');

      expect(authClient.post).toHaveBeenCalledWith(
        '/auth/magiclink',
        { email: 'test@example.com' },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should only send email when no provisional token exists', async () => {
      (getItem as jest.Mock).mockReturnValue(null); // provisionalAccessToken
      (authClient.post as jest.Mock).mockResolvedValue({ data: {} });

      await requestMagicLink('test@example.com');

      // No provisional token, so no Authorization header
      expect(authClient.post).toHaveBeenCalledWith(
        '/auth/magiclink',
        {
          email: 'test@example.com',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should include provisional token in headers when available', async () => {
      (getItem as jest.Mock).mockReturnValue('provisional-token-123'); // provisionalAccessToken
      (authClient.post as jest.Mock).mockResolvedValue({ data: {} });

      await requestMagicLink('test@example.com');

      expect(authClient.post).toHaveBeenCalledWith(
        '/auth/magiclink',
        { email: 'test@example.com' },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer provisional-token-123',
          },
        }
      );
    });

    it('should include token in header when provisional token is available', async () => {
      (getItem as jest.Mock).mockReturnValue('provisional-token-123'); // provisionalAccessToken
      (authClient.post as jest.Mock).mockResolvedValue({ data: {} });

      await requestMagicLink('test@example.com');

      // Token is sent in the Authorization header
      expect(authClient.post).toHaveBeenCalledWith(
        '/auth/magiclink',
        {
          email: 'test@example.com',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer provisional-token-123',
          },
        }
      );
    });

    it('should not include Authorization header when provisional token is empty string', async () => {
      (getItem as jest.Mock).mockReturnValue(''); // empty provisionalAccessToken
      (authClient.post as jest.Mock).mockResolvedValue({ data: {} });

      await requestMagicLink('test@example.com');

      // Empty string should not add Authorization header
      expect(authClient.post).toHaveBeenCalledWith(
        '/auth/magiclink',
        { email: 'test@example.com' },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle API errors', async () => {
      const error = new Error('Network error');
      (authClient.post as jest.Mock).mockRejectedValue(error);

      await expect(requestMagicLink('test@example.com')).rejects.toThrow(
        'Network error'
      );
      expect(console.error).toHaveBeenCalledWith(
        'Magic link request error:',
        error
      );
    });
  });

  describe('verifyMagicLink', () => {
    beforeEach(() => {
      (authClient.get as jest.Mock).mockClear();
    });

    it('should verify magic link and store tokens', async () => {
      const mockTokens = {
        access: { token: 'access-token', expires: '2025-01-01' },
        refresh: { token: 'refresh-token', expires: '2025-02-01' },
      };
      (authClient.get as jest.Mock).mockResolvedValue({ data: mockTokens });

      const result = await verifyMagicLink('test-token');

      expect(authClient.get).toHaveBeenCalledWith(
        '/auth/magiclink/verify?token=test-token'
      );
      expect(tokenService.storeTokens).toHaveBeenCalledWith(mockTokens);
      expect(removeItem).toHaveBeenCalledWith('provisionalAccessToken');
      expect(removeItem).toHaveBeenCalledWith('provisionalUserId');
      expect(removeItem).toHaveBeenCalledWith('provisionalEmail');
      expect(result).toEqual(mockTokens);
    });

    it('should throw error if token is not a string', async () => {
      await expect(verifyMagicLink(123 as any)).rejects.toThrow(
        'Token is not a string'
      );
    });

    it('should handle API errors', async () => {
      const error = new Error('Invalid token');
      (authClient.get as jest.Mock).mockRejectedValue(error);

      await expect(verifyMagicLink('test-token')).rejects.toThrow(
        'Invalid token'
      );
      expect(console.error).toHaveBeenCalledWith(
        'Magic link verification error:',
        error
      );
    });
  });

  describe('verifyMagicLinkAndSignIn', () => {
    const mockTokens = {
      access: { token: 'access-token', expires: '2025-01-01' },
      refresh: { token: 'refresh-token', expires: '2025-02-01' },
    };

    beforeEach(() => {
      (authClient.get as jest.Mock).mockClear();
      (authClient.get as jest.Mock).mockResolvedValue({ data: mockTokens });
    });

    it('should verify, sign in, and fetch user data without character', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockSetUser = jest.fn();

      (getUserDetails as jest.Mock).mockResolvedValue(mockUser);
      (useUserStore.getState as jest.Mock).mockReturnValue({
        setUser: mockSetUser,
      });

      const result = await verifyMagicLinkAndSignIn('test-token');

      expect(signIn).toHaveBeenCalledWith({
        token: {
          access: 'access-token',
          refresh: 'refresh-token',
        },
      });
      expect(mockSetUser).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(result).toBe('app');
    });

    it('should handle user with character data', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        character: {
          type: 'alchemist',
          name: 'Test Alchemist',
          level: 5,
          currentXP: 250,
          xpToNextLevel: 500,
        },
        dailyQuestStreak: 7,
      };
      const mockSetUser = jest.fn();

      (getUserDetails as jest.Mock).mockResolvedValue(mockUser);
      (useUserStore.getState as jest.Mock).mockReturnValue({
        setUser: mockSetUser,
      });

      const result = await verifyMagicLinkAndSignIn('test-token');

      // setUser is called with the full user object including character data
      expect(mockSetUser).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        character: {
          type: 'alchemist',
          name: 'Test Alchemist',
          level: 5,
          currentXP: 250,
          xpToNextLevel: 500,
        },
        dailyQuestStreak: 7,
      });
      expect(result).toBe('app');
      // Character store logic is tested via integration tests due to dynamic import complexity
    });

    it('should continue even if user fetch fails', async () => {
      (getUserDetails as jest.Mock).mockRejectedValue(
        new Error('User fetch error')
      );

      const result = await verifyMagicLinkAndSignIn('test-token');

      expect(signIn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching user data during verification:',
        expect.any(Error)
      );
      expect(result).toBe('app');
    });

    it('should throw error if verification fails', async () => {
      const error = new Error('Verification failed');
      (authClient.get as jest.Mock).mockRejectedValue(error);

      await expect(verifyMagicLinkAndSignIn('test-token')).rejects.toThrow(
        'Verification failed'
      );
      expect(console.error).toHaveBeenCalledWith(
        'Magic link verification failed:',
        error
      );
    });
  });

  describe('completeSignIn', () => {
    const mockTokens = {
      access: { token: 'access-token', expires: '2025-01-01' },
      refresh: { token: 'refresh-token', expires: '2025-02-01' },
    };

    it('should sign in, fetch user data, and identify to posthog', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockSetUser = jest.fn();

      (getUserDetails as jest.Mock).mockResolvedValue(mockUser);
      (useUserStore.getState as jest.Mock).mockReturnValue({
        setUser: mockSetUser,
      });

      const result = await completeSignIn(mockTokens);

      expect(signIn).toHaveBeenCalledWith({
        token: {
          access: 'access-token',
          refresh: 'refresh-token',
        },
      });
      expect(getUserDetails).toHaveBeenCalled();
      expect(mockSetUser).toHaveBeenCalledWith(mockUser);
      expect(posthogClient.identify).toHaveBeenCalledWith('user-123');
      expect(result).toBe('app');
    });

    it('should continue and return app even if user fetch fails', async () => {
      (getUserDetails as jest.Mock).mockRejectedValue(
        new Error('User fetch error')
      );

      const result = await completeSignIn(mockTokens);

      expect(signIn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching user data during verification:',
        expect.any(Error)
      );
      expect(result).toBe('app');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when access token exists', () => {
      (tokenService.getAccessToken as jest.Mock).mockReturnValue(
        'access-token'
      );
      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when access token is null', () => {
      (tokenService.getAccessToken as jest.Mock).mockReturnValue(null);
      expect(isAuthenticated()).toBe(false);
    });

    it('should return false when access token is empty string', () => {
      (tokenService.getAccessToken as jest.Mock).mockReturnValue('');
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('logout', () => {
    it('should remove tokens successfully', () => {
      logout();
      expect(tokenService.removeTokens).toHaveBeenCalled();
    });

    it('should handle errors during logout', () => {
      const error = new Error('Storage error');
      (tokenService.removeTokens as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => logout()).toThrow('Storage error');
      expect(console.error).toHaveBeenCalledWith('Error during logout:', error);
    });
  });

  describe('refreshAccessToken', () => {
    beforeEach(() => {
      (authClient.post as jest.Mock).mockClear();
    });

    it('should refresh tokens successfully', async () => {
      const mockNewTokens = {
        access: { token: 'new-access-token', expires: '2025-01-02' },
        refresh: { token: 'new-refresh-token', expires: '2025-02-02' },
      };
      (tokenService.getRefreshToken as jest.Mock).mockReturnValue(
        'old-refresh-token'
      );
      (authClient.post as jest.Mock).mockResolvedValue({ data: mockNewTokens });

      const result = await refreshAccessToken();

      expect(authClient.post).toHaveBeenCalledWith('/auth/refresh-tokens', {
        refreshToken: 'old-refresh-token',
      });
      expect(tokenService.storeTokens).toHaveBeenCalledWith(mockNewTokens);
      expect(result).toEqual(mockNewTokens);
    });

    it('should return null if no refresh token exists', async () => {
      (tokenService.getRefreshToken as jest.Mock).mockReturnValue(null);

      const result = await refreshAccessToken();

      expect(authClient.post).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should clear tokens and return null on refresh error', async () => {
      const error = new Error('Refresh failed');
      (tokenService.getRefreshToken as jest.Mock).mockReturnValue(
        'old-refresh-token'
      );
      (tokenService.removeTokens as jest.Mock).mockImplementation(() => {}); // Reset to not throw
      (authClient.post as jest.Mock).mockRejectedValue(error);

      const result = await refreshAccessToken();

      expect(console.error).toHaveBeenCalledWith(
        'Error refreshing token:',
        error
      );
      expect(tokenService.removeTokens).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('removeTokens', () => {
    it('should be an alias for tokenService.removeTokens', () => {
      expect(removeTokens).toBe(tokenService.removeTokens);
    });
  });
});
