import { signIn } from '@/lib/auth';
import {
  ExistingAccountConfirmationRequired,
  NoAccountForIdentity,
} from '@/lib/auth/social';
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
  socialSignIn,
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

  describe('socialSignIn', () => {
    const credential = {
      provider: 'google' as const,
      idToken: 'google-id-token',
    };

    /**
     * Build a minimal axios-shaped rejection the way `axios.isAxiosError`
     * recognises it (the root `__mocks__/axios.ts` keys off `isAxiosError`).
     */
    const axiosError = (status: number, data?: unknown) =>
      Object.assign(new Error(`Request failed with status code ${status}`), {
        isAxiosError: true,
        response: { status, data },
      });

    /** The server's existing-account collision 409 (see resolve-user.js). */
    const collision409 = (account?: unknown) =>
      axiosError(409, {
        code: 409,
        message: 'Existing account requires confirmation',
        details: { reason: 'existing-account-confirmation-required', account },
      });

    const mockTokens = {
      access: { token: 'access-token', expires: '2025-01-01' },
      refresh: { token: 'refresh-token', expires: '2025-02-01' },
    };

    beforeEach(() => {
      (authClient.post as jest.Mock).mockClear();
      (authClient.post as jest.Mock).mockResolvedValue({
        data: { tokens: mockTokens, outcome: 'existing' },
      });
      (getUserDetails as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      });
      (useUserStore.getState as jest.Mock).mockReturnValue({
        setUser: jest.fn(),
      });
    });

    it('posts the credential without an Authorization header when there is no provisional token', async () => {
      (getItem as jest.Mock).mockReturnValue(null);

      await socialSignIn(credential);

      expect(authClient.post).toHaveBeenCalledWith(
        '/auth/social',
        { ...credential, confirmExistingAccount: false },
        { headers: { 'Content-Type': 'application/json' } }
      );
    });

    it('posts the credential with a provisional Bearer header when a provisional token exists', async () => {
      (getItem as jest.Mock).mockReturnValue('provisional-token-123');

      await socialSignIn(credential);

      expect(authClient.post).toHaveBeenCalledWith(
        '/auth/social',
        { ...credential, confirmExistingAccount: false },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer provisional-token-123',
          },
        }
      );
    });

    it('includes the apple nonce in the posted body when present', async () => {
      (getItem as jest.Mock).mockReturnValue(null);
      const appleCredential = {
        provider: 'apple' as const,
        idToken: 'apple-id-token',
        nonce: 'raw-nonce',
      };

      await socialSignIn(appleCredential);

      expect(authClient.post).toHaveBeenCalledWith(
        '/auth/social',
        { ...appleCredential, confirmExistingAccount: false },
        { headers: { 'Content-Type': 'application/json' } }
      );
    });

    it('stores the returned tokens', async () => {
      (getItem as jest.Mock).mockReturnValue(null);

      await socialSignIn(credential);

      expect(tokenService.storeTokens).toHaveBeenCalledWith(mockTokens);
    });

    it('clears provisional storage after a successful sign-in', async () => {
      (getItem as jest.Mock).mockReturnValue('provisional-token-123');

      await socialSignIn(credential);

      expect(removeItem).toHaveBeenCalledWith('provisionalAccessToken');
      expect(removeItem).toHaveBeenCalledWith('provisionalUserId');
      expect(removeItem).toHaveBeenCalledWith('provisionalEmail');
    });

    it('returns the completeSignIn target alongside the server outcome', async () => {
      (getItem as jest.Mock).mockReturnValue(null);
      (authClient.post as jest.Mock).mockResolvedValue({
        data: { tokens: mockTokens, outcome: 'created' },
      });

      const result = await socialSignIn(credential);

      expect(result).toEqual({ target: 'app', outcome: 'created' });
    });

    it('forwards confirmExistingAccount when the caller replays a confirmed credential', async () => {
      (getItem as jest.Mock).mockReturnValue('provisional-token-123');

      await socialSignIn(credential, true);

      expect(authClient.post).toHaveBeenCalledWith(
        '/auth/social',
        { ...credential, confirmExistingAccount: true },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer provisional-token-123',
          },
        }
      );
    });

    it('propagates a raw server 409 that carries no response body', async () => {
      const error = axiosError(409, undefined);
      (authClient.post as jest.Mock).mockRejectedValue(error);

      await expect(socialSignIn(credential)).rejects.toBe(error);
    });

    it('throws a typed error carrying the account summary on the collision 409', async () => {
      (getItem as jest.Mock).mockReturnValue('provisional-token-123');
      (authClient.post as jest.Mock).mockRejectedValue(
        collision409({ name: 'Rowan', level: 12, dailyQuestStreak: 4 })
      );

      const err = await socialSignIn(credential).catch((e) => e);

      expect(err).toBeInstanceOf(ExistingAccountConfirmationRequired);
      expect(err).toHaveProperty('account', {
        name: 'Rowan',
        level: 12,
        dailyQuestStreak: 4,
      });
    });

    it('keeps the wire name verbatim when the colliding account has no hero', async () => {
      // The server sends `character?.name || ''`, and a social signup that
      // never picked a hero has no character — so `''` is a real wire value,
      // not a bug. Defaulting it here would hide it from the sheet, which is
      // the layer that decides the fallback copy.
      (getItem as jest.Mock).mockReturnValue('provisional-token-123');
      (authClient.post as jest.Mock).mockRejectedValue(
        collision409({ name: '', level: 1, dailyQuestStreak: 0 })
      );

      await expect(socialSignIn(credential)).rejects.toHaveProperty('account', {
        name: '',
        level: 1,
        dailyQuestStreak: 0,
      });
    });

    it('falls back to an empty summary when the collision 409 omits the account', async () => {
      (getItem as jest.Mock).mockReturnValue('provisional-token-123');
      (authClient.post as jest.Mock).mockRejectedValue(collision409(undefined));

      // toHaveProperty, not toMatchObject: the latter's subset semantics treat
      // an empty expected object as matching anything (`Object.keys({}).every`
      // is vacuously true), so `toMatchObject({ account: {} })` passes even
      // when `account` is `undefined` — i.e. it cannot see this regression.
      await expect(socialSignIn(credential)).rejects.toHaveProperty(
        'account',
        {}
      );
    });

    it('rethrows the generic email-in-use 409 untouched (no details payload)', async () => {
      // The 409 the magic-link path already owns. Keying on status instead of
      // details.reason would swallow this one.
      (getItem as jest.Mock).mockReturnValue('provisional-token-123');
      const generic409 = axiosError(409, {
        code: 409,
        message: 'Email address is already in use by another account.',
      });
      (authClient.post as jest.Mock).mockRejectedValue(generic409);

      await expect(socialSignIn(credential)).rejects.toBe(generic409);
    });

    it('rethrows an axios error whose details.reason is some other reason', async () => {
      (getItem as jest.Mock).mockReturnValue('provisional-token-123');
      const otherReason = axiosError(409, {
        details: { reason: 'some-other-reason', account: { name: 'Rowan' } },
      });
      (authClient.post as jest.Mock).mockRejectedValue(otherReason);

      await expect(socialSignIn(credential)).rejects.toBe(otherReason);
    });

    it('translates the no-account 404 into NoAccountForIdentity', async () => {
      (getItem as jest.Mock).mockReturnValue(null);
      (authClient.post as jest.Mock).mockRejectedValue(
        axiosError(404, {
          code: 404,
          message: 'User not found',
          details: {
            reason: 'no-account-for-identity',
            email: 'tommy@gmail.com',
          },
        })
      );

      const err = await socialSignIn(credential).catch((e) => e);

      expect(err).toBeInstanceOf(NoAccountForIdentity);
      expect(err).toMatchObject({ email: 'tommy@gmail.com' });
    });

    it('re-throws a 404 that carries no details', async () => {
      const error = axiosError(404, {});
      (authClient.post as jest.Mock).mockRejectedValue(error);

      await expect(socialSignIn(credential)).rejects.toBe(error);
    });

    it('rethrows a non-axios failure as the very same object', async () => {
      (getItem as jest.Mock).mockReturnValue(null);
      const networkError = new Error('Network Error');
      (authClient.post as jest.Mock).mockRejectedValue(networkError);

      await expect(socialSignIn(credential)).rejects.toBe(networkError);
    });

    it('leaves provisional storage intact when the collision throws', async () => {
      // Load-bearing ordering: the confirm re-post has to still carry the
      // provisional Bearer header (so it lands on the conversion branch), and
      // dismissing the sheet has to leave the local hero alive.
      (getItem as jest.Mock).mockReturnValue('provisional-token-123');
      (authClient.post as jest.Mock).mockRejectedValue(
        collision409({ name: 'Rowan', level: 12, dailyQuestStreak: 4 })
      );

      await expect(socialSignIn(credential)).rejects.toBeInstanceOf(
        ExistingAccountConfirmationRequired
      );

      expect(removeItem).not.toHaveBeenCalled();
    });

    it('propagates a raw completeSignIn failure instead of swallowing it', async () => {
      (getItem as jest.Mock).mockReturnValue(null);
      (signIn as jest.Mock).mockImplementation(() => {
        throw new Error('signIn store update failed');
      });

      await expect(socialSignIn(credential)).rejects.toThrow(
        'signIn store update failed'
      );
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
