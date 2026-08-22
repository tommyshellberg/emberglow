import { endProvisionalSession, signIn } from '@/lib/auth';
import {
  ProvisionalRefreshUnavailable,
  ProvisionalSessionExpired,
} from '@/lib/auth/provisional-session';
import {
  ExistingAccountConfirmationRequired,
  NoAccountForIdentity,
} from '@/lib/auth/social';
import { posthogClient } from '@/lib/posthog';
import { getUserDetails } from '@/lib/services/user';
import { getItem, removeItem, setItem } from '@/lib/storage';
import { useCharacterStore } from '@/store/character-store';
import { useUserStore } from '@/store/user-store';

import {
  authClient,
  completeSignIn,
  isAuthenticated,
  logout,
  refreshAccessToken,
  refreshProvisionalTokens,
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
      // Keyed, not blanket: a bare mockReturnValue hands the SAME string to
      // every key, including `provisionalRefreshToken`, describing a disk
      // state that cannot exist. These cases are about the Bearer header, so
      // the honest shape is an access token with nothing to refresh with.
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalAccessToken' || key === 'provisionalUserId'
          ? 'provisional-token-123'
          : null
      );
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
      // Keyed, not blanket: a bare mockReturnValue hands the SAME string to
      // every key, including `provisionalRefreshToken`, describing a disk
      // state that cannot exist. These cases are about the Bearer header, so
      // the honest shape is an access token with nothing to refresh with.
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalAccessToken' || key === 'provisionalUserId'
          ? 'provisional-token-123'
          : null
      );
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

    it('applies a server streak even when the response has no character', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        dailyQuestStreak: 9,
      };
      const mockSetUser = jest.fn();

      (getUserDetails as jest.Mock).mockResolvedValue(mockUser);
      (useUserStore.getState as jest.Mock).mockReturnValue({
        setUser: mockSetUser,
      });
      useCharacterStore.setState({ character: null, dailyQuestStreak: 0 });

      await verifyMagicLinkAndSignIn('test-token');

      expect(useCharacterStore.getState().dailyQuestStreak).toBe(9);
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
      // Keyed, not blanket: a bare mockReturnValue hands the SAME string to
      // every key, including `provisionalRefreshToken`, describing a disk
      // state that cannot exist. These cases are about the Bearer header, so
      // the honest shape is an access token with nothing to refresh with.
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalAccessToken' || key === 'provisionalUserId'
          ? 'provisional-token-123'
          : null
      );

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
      // Keyed, not blanket: a bare mockReturnValue hands the SAME string to
      // every key, including `provisionalRefreshToken`, describing a disk
      // state that cannot exist. These cases are about the Bearer header, so
      // the honest shape is an access token with nothing to refresh with.
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalAccessToken' || key === 'provisionalUserId'
          ? 'provisional-token-123'
          : null
      );

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
      // Keyed, not blanket: a bare mockReturnValue hands the SAME string to
      // every key, including `provisionalRefreshToken`, describing a disk
      // state that cannot exist. These cases are about the Bearer header, so
      // the honest shape is an access token with nothing to refresh with.
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalAccessToken' || key === 'provisionalUserId'
          ? 'provisional-token-123'
          : null
      );

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
      // Keyed, not blanket: a bare mockReturnValue hands the SAME string to
      // every key, including `provisionalRefreshToken`, describing a disk
      // state that cannot exist. These cases are about the Bearer header, so
      // the honest shape is an access token with nothing to refresh with.
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalAccessToken' || key === 'provisionalUserId'
          ? 'provisional-token-123'
          : null
      );
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
      // Keyed, not blanket: a bare mockReturnValue hands the SAME string to
      // every key, including `provisionalRefreshToken`, describing a disk
      // state that cannot exist. These cases are about the Bearer header, so
      // the honest shape is an access token with nothing to refresh with.
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalAccessToken' || key === 'provisionalUserId'
          ? 'provisional-token-123'
          : null
      );
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
      // Keyed, not blanket: a bare mockReturnValue hands the SAME string to
      // every key, including `provisionalRefreshToken`, describing a disk
      // state that cannot exist. These cases are about the Bearer header, so
      // the honest shape is an access token with nothing to refresh with.
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalAccessToken' || key === 'provisionalUserId'
          ? 'provisional-token-123'
          : null
      );
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
      // Keyed, not blanket: a bare mockReturnValue hands the SAME string to
      // every key, including `provisionalRefreshToken`, describing a disk
      // state that cannot exist. These cases are about the Bearer header, so
      // the honest shape is an access token with nothing to refresh with.
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalAccessToken' || key === 'provisionalUserId'
          ? 'provisional-token-123'
          : null
      );
      const generic409 = axiosError(409, {
        code: 409,
        message: 'Email address is already in use by another account.',
      });
      (authClient.post as jest.Mock).mockRejectedValue(generic409);

      await expect(socialSignIn(credential)).rejects.toBe(generic409);
    });

    it('rethrows an axios error whose details.reason is some other reason', async () => {
      // Keyed, not blanket: a bare mockReturnValue hands the SAME string to
      // every key, including `provisionalRefreshToken`, describing a disk
      // state that cannot exist. These cases are about the Bearer header, so
      // the honest shape is an access token with nothing to refresh with.
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalAccessToken' || key === 'provisionalUserId'
          ? 'provisional-token-123'
          : null
      );
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
      // Keyed, not blanket: a bare mockReturnValue hands the SAME string to
      // every key, including `provisionalRefreshToken`, describing a disk
      // state that cannot exist. These cases are about the Bearer header, so
      // the honest shape is an access token with nothing to refresh with.
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalAccessToken' || key === 'provisionalUserId'
          ? 'provisional-token-123'
          : null
      );
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

  // A gated veteran guest arrives at the conversion screen with an access
  // token that is almost always stale (they expire in 30 minutes and nothing
  // behind the wall refreshes them). Both conversion endpoints use the
  // server's `auth.optional`, which SWALLOWS an expired token and continues
  // with no `req.user` — no 401, no signal — so the conversion silently
  // becomes a plain sign-up and the progress it exists to save is lost.
  describe('provisional refresh before conversion', () => {
    const credential = {
      provider: 'google' as const,
      idToken: 'google-id-token',
    };

    const freshTokens = {
      access: { token: 'fresh-prov-access', expires: '2025-01-02' },
      refresh: { token: 'fresh-prov-refresh', expires: '2025-02-02' },
    };

    const realTokens = {
      access: { token: 'real-access', expires: '2025-01-01' },
      refresh: { token: 'real-refresh', expires: '2025-02-01' },
    };

    /** A guest who has been away long enough for the access token to lapse. */
    const guestOnDisk = () =>
      (getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'provisionalAccessToken') return 'stale-prov-access';
        if (key === 'provisionalRefreshToken') return 'prov-refresh';
        if (key === 'provisionalUserId') return 'prov-user-1';
        return null;
      });

    /**
     * A legacy install: an access token but NO refresh token. Reachable
     * because `createProvisionalUser` stores the refresh token conditionally
     * (`user.ts`), and `auth hydrate()` still carries a
     * `provisionalRefreshToken || provisionalToken` fallback for this shape.
     */
    const guestWithNoRefreshToken = () =>
      (getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'provisionalAccessToken') return 'stale-prov-access';
        if (key === 'provisionalUserId') return 'prov-user-1';
        return null;
      });

    /** Route POSTs by URL so the refresh and the conversion can differ. */
    const respond = (handlers: Record<string, () => unknown>) =>
      (authClient.post as jest.Mock).mockImplementation((url: string) => {
        const handler = handlers[url];
        if (!handler) {
          return Promise.reject(new Error(`unexpected POST to ${url}`));
        }
        return handler();
      });

    const postedUrls = () =>
      (authClient.post as jest.Mock).mock.calls.map(([url]) => url);

    beforeEach(() => {
      (authClient.post as jest.Mock).mockClear();
      // clearAllMocks does not clear implementations — pin the default so a
      // mockImplementation from one test can't leak into the next.
      (getItem as jest.Mock).mockReturnValue(null);
      // Same reason: an earlier test leaves `signIn` throwing on purpose.
      (signIn as jest.Mock).mockReset();
      (getUserDetails as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      });
      (useUserStore.getState as jest.Mock).mockReturnValue({
        setUser: jest.fn(),
      });
    });

    it('sends the REFRESHED provisional token on the magic-link conversion', async () => {
      guestOnDisk();
      respond({
        '/auth/refresh-tokens': () => Promise.resolve({ data: freshTokens }),
        '/auth/magiclink': () => Promise.resolve({ data: {} }),
      });

      await requestMagicLink('me@example.com');

      expect(postedUrls()).toEqual(['/auth/refresh-tokens', '/auth/magiclink']);
      expect(authClient.post).toHaveBeenCalledWith(
        '/auth/magiclink',
        { email: 'me@example.com' },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer fresh-prov-access',
          },
        }
      );
    });

    it('sends the REFRESHED provisional token on the social conversion', async () => {
      guestOnDisk();
      respond({
        '/auth/refresh-tokens': () => Promise.resolve({ data: freshTokens }),
        '/auth/social': () =>
          Promise.resolve({
            data: { tokens: realTokens, outcome: 'converted' },
          }),
      });

      await socialSignIn(credential);

      expect(postedUrls()).toEqual(['/auth/refresh-tokens', '/auth/social']);
      expect(authClient.post).toHaveBeenCalledWith(
        '/auth/social',
        { ...credential, confirmExistingAccount: false },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer fresh-prov-access',
          },
        }
      );
    });

    // The normal sign-in path must be untouched: no provisional session, no
    // extra round trip, no new failure mode for users who never were guests.
    it.each([
      [
        'magic link',
        () => requestMagicLink('me@example.com'),
        '/auth/magiclink',
      ],
      ['social', () => socialSignIn(credential), '/auth/social'],
    ])(
      'does not touch the refresh endpoint on the %s path when no provisional session exists',
      async (_label, run, url) => {
        (getItem as jest.Mock).mockReturnValue(null);
        respond({
          '/auth/magiclink': () => Promise.resolve({ data: {} }),
          '/auth/social': () =>
            Promise.resolve({
              data: { tokens: realTokens, outcome: 'created' },
            }),
        });

        await run();

        expect(postedUrls()).toEqual([url]);
      }
    );

    // Only a 401 on the REFRESH token proves the server disowned the session.
    it.each([
      ['magic link', () => requestMagicLink('me@example.com')],
      ['social', () => socialSignIn(credential)],
    ])(
      'ends the session and abandons the %s conversion when the refresh token is rejected',
      async (_label, run) => {
        guestOnDisk();
        respond({
          '/auth/refresh-tokens': () =>
            Promise.reject({ response: { status: 401 } }),
        });

        await expect(run()).rejects.toBeInstanceOf(ProvisionalSessionExpired);

        expect(endProvisionalSession).toHaveBeenCalled();
        // Aborted, not attempted: sending it anyway would create a SECOND,
        // empty account for the same person under the same email.
        expect(postedUrls()).toEqual(['/auth/refresh-tokens']);
        // endProvisionalSession wipes on acknowledge, never underneath the
        // notice — nothing here may clear the keys inline.
        expect(removeItem).not.toHaveBeenCalled();
      }
    );

    // `doRefreshProvisionalTokens` answers 'dead' for a missing refresh token
    // WITHOUT contacting the server. That is correct for its other caller —
    // the provisional-client interceptor, which only asks after a 401 has
    // already proven the access token rejected — but here we ask PROACTIVELY,
    // with no such proof. Inheriting 'dead' would wipe a working session's
    // character, quests and POIs (wipeGuestSession is explicitly "no
    // salvage") on no server evidence at all, which is the exact loss this
    // whole branch exists to prevent.
    it.each([
      [
        'magic link',
        () => requestMagicLink('me@example.com'),
        '/auth/magiclink',
      ],
      ['social', () => socialSignIn(credential), '/auth/social'],
    ])(
      'attempts the %s conversion with the stored token when there is no refresh token to refresh WITH',
      async (_label, run, url) => {
        guestWithNoRefreshToken();
        respond({
          '/auth/magiclink': () => Promise.resolve({ data: {} }),
          '/auth/social': () =>
            Promise.resolve({
              data: { tokens: realTokens, outcome: 'converted' },
            }),
        });

        await run();

        // No server was ever asked, so nothing proved this session dead.
        expect(endProvisionalSession).not.toHaveBeenCalled();
        expect(postedUrls()).toEqual([url]);
        expect(authClient.post).toHaveBeenCalledWith(
          url,
          expect.anything(),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer stale-prov-access',
            }),
          })
        );
      }
    );

    // A flaky network is not proof of anything. Wiping here would destroy an
    // unclaimed hero over a dropped packet, and the stale token may well
    // still be valid.
    it.each([
      [
        'magic link',
        () => requestMagicLink('me@example.com'),
        '/auth/magiclink',
      ],
      ['social', () => socialSignIn(credential), '/auth/social'],
    ])(
      'keeps the session but ABANDONS the %s conversion when the refresh cannot be reached',
      async (_label, run, url) => {
        guestOnDisk();
        respond({
          '/auth/refresh-tokens': () =>
            Promise.reject(new Error('Network Error')),
          // The server's REAL answer to a conversion carrying a token it
          // cannot read: `auth.optional` swallows it, so this degrades into a
          // plain signup that mints a second account and orphans the hero.
          // Fixturing 'converted' here would have asserted the one outcome a
          // stale token cannot produce.
          '/auth/magiclink': () => Promise.resolve({ data: {} }),
          '/auth/social': () =>
            Promise.resolve({
              data: { tokens: realTokens, outcome: 'created' },
            }),
        });

        await expect(run()).rejects.toBeInstanceOf(
          ProvisionalRefreshUnavailable
        );

        // Nothing was proven about the session, so it survives untouched…
        expect(endProvisionalSession).not.toHaveBeenCalled();
        expect(removeItem).not.toHaveBeenCalled();

        // …and the conversion never went out. Asserting the exact URL list is
        // what makes this fail if the abort is removed: a `rejects` assertion
        // alone would still pass if the POST fired and something else threw.
        expect(postedUrls()).toEqual(['/auth/refresh-tokens']);
        expect(authClient.post).not.toHaveBeenCalledWith(
          url,
          expect.anything(),
          expect.anything()
        );
      }
    );

    it.each([
      ['magic link', () => requestMagicLink('me@example.com')],
      ['social', () => socialSignIn(credential)],
    ])(
      'reports the unrefreshable %s conversion instead of failing silently',
      async (_label, run) => {
        guestWithNoRefreshToken();
        respond({
          '/auth/magiclink': () => Promise.resolve({ data: {} }),
          '/auth/social': () =>
            Promise.resolve({
              data: { tokens: realTokens, outcome: 'created' },
            }),
        });

        await run();

        expect(posthogClient.capture).toHaveBeenCalledWith(
          'provisional_conversion_unrefreshable'
        );
      }
    );
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

  describe('refreshProvisionalTokens', () => {
    const mockNewTokens = {
      access: { token: 'new-prov-access', expires: '2025-01-02' },
      refresh: { token: 'new-prov-refresh', expires: '2025-02-02' },
    };

    beforeEach(() => {
      (authClient.post as jest.Mock).mockClear();
      // clearAllMocks does not clear implementations — pin the default so a
      // mockImplementation from one test can't leak into the next.
      (getItem as jest.Mock).mockReturnValue(null);
    });

    it('refreshes via the provisional refresh token and stores the rotated pair', async () => {
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalRefreshToken' ? 'prov-refresh-token' : null
      );
      (authClient.post as jest.Mock).mockResolvedValue({
        data: mockNewTokens,
      });

      const result = await refreshProvisionalTokens();

      expect(authClient.post).toHaveBeenCalledWith('/auth/refresh-tokens', {
        refreshToken: 'prov-refresh-token',
      });
      expect(setItem).toHaveBeenCalledWith(
        'provisionalAccessToken',
        'new-prov-access'
      );
      expect(setItem).toHaveBeenCalledWith(
        'provisionalRefreshToken',
        'new-prov-refresh'
      );
      expect(result).toEqual({ status: 'refreshed', tokens: mockNewTokens });
    });

    it('reports a dead session when the server answers 401', async () => {
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalRefreshToken' ? 'consumed-or-expired' : null
      );
      (authClient.post as jest.Mock).mockRejectedValue({
        response: { status: 401 },
      });

      const result = await refreshProvisionalTokens();

      expect(result).toEqual({ status: 'dead' });
      expect(setItem).not.toHaveBeenCalled();
    });

    it('reports a dead session when no provisional refresh token exists', async () => {
      (getItem as jest.Mock).mockReturnValue(null);

      const result = await refreshProvisionalTokens();

      expect(authClient.post).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'dead' });
    });

    it('reports a recoverable error (NOT death) on a network failure', async () => {
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalRefreshToken' ? 'prov-refresh-token' : null
      );
      // No `response` property at all — the axios shape of a network error.
      (authClient.post as jest.Mock).mockRejectedValue(new Error('timeout'));

      const result = await refreshProvisionalTokens();

      expect(result).toEqual({ status: 'error' });
      expect(setItem).not.toHaveBeenCalled();
    });

    it('reports a recoverable error on a malformed token response', async () => {
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalRefreshToken' ? 'prov-refresh-token' : null
      );
      (authClient.post as jest.Mock).mockResolvedValue({
        data: { access: {} },
      });

      const result = await refreshProvisionalTokens();

      expect(result).toEqual({ status: 'error' });
      expect(setItem).not.toHaveBeenCalled();
    });

    it('deduplicates concurrent refreshes into a single request', async () => {
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalRefreshToken' ? 'prov-refresh-token' : null
      );
      let resolvePost: (value: any) => void;
      (authClient.post as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          resolvePost = resolve;
        })
      );

      const first = refreshProvisionalTokens();
      const second = refreshProvisionalTokens();

      // The server consumes the refresh token on first use, so a second
      // in-flight POST would present a deleted token, 401, and misread a
      // healthy session as dead.
      expect(authClient.post).toHaveBeenCalledTimes(1);

      resolvePost!({ data: mockNewTokens });
      const [r1, r2] = await Promise.all([first, second]);
      expect(r1).toEqual({ status: 'refreshed', tokens: mockNewTokens });
      expect(r2).toEqual({ status: 'refreshed', tokens: mockNewTokens });
    });
  });

  describe('removeTokens', () => {
    it('should be an alias for tokenService.removeTokens', () => {
      expect(removeTokens).toBe(tokenService.removeTokens);
    });
  });
});
