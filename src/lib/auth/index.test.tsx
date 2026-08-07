import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { OneSignal } from 'react-native-onesignal';

import { storeTokens } from '@/api/token';
import { getUserDetails } from '@/lib/services/user';
import { getItem, removeItem } from '@/lib/storage';
import { useUserStore } from '@/store/user-store';

import { endProvisionalSession, useAuth } from './index';
import { getToken, removeToken, setToken } from './utils';

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  setTag: jest.fn(),
  setUser: jest.fn(),
}));

// Mock all dependencies
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

jest.mock('react-native-onesignal', () => ({
  OneSignal: {
    logout: jest.fn(),
    login: jest.fn(),
    User: {
      getExternalId: jest.fn(),
    },
  },
}));

jest.mock('@/api/token', () => ({
  storeTokens: jest.fn(),
}));

jest.mock('@/lib/services/user', () => ({
  getUserDetails: jest.fn(),
}));

jest.mock('@/store/user-store', () => ({
  useUserStore: {
    getState: jest.fn(() => ({
      setUser: jest.fn(),
      clearUser: jest.fn(),
    })),
  },
}));

// Mock the character store module
jest.mock('@/store/character-store', () => {
  const mockCreateCharacter = jest.fn();
  const mockUpdateCharacter = jest.fn();
  const mockSetStreak = jest.fn();
  const mockResetCharacter = jest.fn();
  const mockGetState = jest.fn(() => ({
    character: null,
    createCharacter: mockCreateCharacter,
    updateCharacter: mockUpdateCharacter,
    setStreak: mockSetStreak,
    resetCharacter: mockResetCharacter,
  }));

  return {
    useCharacterStore: {
      getState: mockGetState,
    },
    __mocks: {
      mockCreateCharacter,
      mockUpdateCharacter,
      mockSetStreak,
      mockResetCharacter,
      mockGetState,
    },
  };
});

// Progress stores wiped by wipeGuestSession
jest.mock('@/store/quest-store', () => {
  const mockQuestReset = jest.fn();
  return {
    useQuestStore: { getState: jest.fn(() => ({ reset: mockQuestReset })) },
    __mocks: { mockQuestReset },
  };
});

jest.mock('@/store/poi-store', () => {
  const mockPoiReset = jest.fn();
  return {
    usePOIStore: { getState: jest.fn(() => ({ reset: mockPoiReset })) },
    __mocks: { mockPoiReset },
  };
});

jest.mock('@/store/onboarding-store', () => {
  const mockResetOnboarding = jest.fn();
  return {
    useOnboardingStore: {
      getState: jest.fn(() => ({ resetOnboarding: mockResetOnboarding })),
    },
    __mocks: { mockResetOnboarding },
  };
});

jest.mock('./utils', () => ({
  getToken: jest.fn(),
  removeToken: jest.fn(),
  setToken: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Get references to the mocks
const characterStoreMocks = require('@/store/character-store').__mocks;

// Mock timers
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();

  // Reset mock functions
  characterStoreMocks.mockCreateCharacter.mockClear();
  characterStoreMocks.mockUpdateCharacter.mockClear();
  characterStoreMocks.mockSetStreak.mockClear();

  // Reset character store to default state
  characterStoreMocks.mockGetState.mockReturnValue({
    character: null,
    createCharacter: characterStoreMocks.mockCreateCharacter,
    updateCharacter: characterStoreMocks.mockUpdateCharacter,
    setStreak: characterStoreMocks.mockSetStreak,
    resetCharacter: characterStoreMocks.mockResetCharacter,
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
  // Reset the store
  useAuth.setState({
    status: 'idle',
    token: null,
  });
  // Reset global state
  (global as any).isOneSignalInitialized = false;
});

describe('Auth Store', () => {
  describe('signIn', () => {
    it('should sign in user and set token', () => {
      const loginResponse = {
        token: {
          access: 'access-token',
          refresh: 'refresh-token',
        },
      };

      useAuth.getState().signIn(loginResponse);

      expect(setToken).toHaveBeenCalledWith({
        access: 'access-token',
        refresh: 'refresh-token',
      });

      const state = useAuth.getState();
      expect(state.status).toBe('signIn');
      expect(state.token).toEqual({
        access: 'access-token',
        refresh: 'refresh-token',
      });
    });

    it('tags authState full', () => {
      const loginResponse = {
        token: {
          access: 'access-token',
          refresh: 'refresh-token',
        },
      };

      useAuth.getState().signIn(loginResponse);

      expect(Sentry.setTag).toHaveBeenCalledWith('authState', 'full');
    });
  });

  describe('endProvisionalSession', () => {
    const questStoreMocks = require('@/store/quest-store').__mocks;
    const poiStoreMocks = require('@/store/poi-store').__mocks;
    const onboardingStoreMocks = require('@/store/onboarding-store').__mocks;

    it('announces the expired character, then wipes everything on acknowledge', () => {
      const mockClearUser = jest.fn();
      (useUserStore.getState as jest.Mock).mockReturnValue({
        clearUser: mockClearUser,
      });
      const alertSpy = jest
        .spyOn(Alert, 'alert')
        .mockImplementation(() => {});

      endProvisionalSession();

      // The notice comes first; nothing is wiped until the user acknowledges
      // it — the wipe must never happen invisibly under a modal.
      expect(removeItem).not.toHaveBeenCalled();
      const [, message, buttons] = alertSpy.mock.calls[0];
      expect(message).toContain('temporary character expired');

      (buttons as any)[0].onPress();

      // Provisional identity gone…
      expect(removeItem).toHaveBeenCalledWith('provisionalAccessToken');
      expect(removeItem).toHaveBeenCalledWith('provisionalRefreshToken');
      expect(removeItem).toHaveBeenCalledWith('provisionalUserId');
      expect(removeItem).toHaveBeenCalledWith('provisionalEmail');

      // …and ALL local progress with it (Tommy's ruling 2026-07-29: no
      // salvage branches — a dead guest starts onboarding over).
      expect(questStoreMocks.mockQuestReset).toHaveBeenCalled();
      expect(poiStoreMocks.mockPoiReset).toHaveBeenCalled();
      expect(characterStoreMocks.mockResetCharacter).toHaveBeenCalled();
      expect(onboardingStoreMocks.mockResetOnboarding).toHaveBeenCalled();

      expect(useAuth.getState().status).toBe('signOut');

      alertSpy.mockRestore();
    });

    // The wipe used to lean on the resolver to route to /onboarding. That
    // works from `(app)`, the only place the interceptors could fire it — but
    // NOT from `/quest-completed-signup` or `/login`, which the conversion
    // gate made into call sites. Both are in PRE_ACCOUNT_ZONE, so
    // `isAlreadyAtTarget('onboarding', …)` answers true and NavigationGate
    // suppresses the redirect: data gone, screen unchanged, alert already
    // promising a fresh start. Same dead-affordance shape as emberglow#365.
    it('leaves the screen it was called from, not just the session', () => {
      (useUserStore.getState as jest.Mock).mockReturnValue({
        clearUser: jest.fn(),
      });
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

      endProvisionalSession();
      (alertSpy.mock.calls[0][2] as any)[0].onPress();

      expect(router.replace).toHaveBeenCalledWith('/onboarding/welcome');

      alertSpy.mockRestore();
    });

    // `refreshProvisionalTokens` is single-flight, so ONE 'dead' verdict is
    // delivered to every joined caller — a gated guest tapping "Continue with
    // Google" while a background provisional request 401s reaches this twice.
    // Two stacked non-cancelable alerts each wipe on acknowledge, and the
    // second runs against an already-signed-out store.
    it('announces a dead session once, however many callers reach it', () => {
      (useUserStore.getState as jest.Mock).mockReturnValue({
        clearUser: jest.fn(),
      });
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

      endProvisionalSession();
      endProvisionalSession();

      expect(alertSpy).toHaveBeenCalledTimes(1);

      // Acknowledging re-arms it: a LATER dead session is a new event and
      // must still be announced, so the guard cannot be a one-way latch.
      (alertSpy.mock.calls[0][2] as any)[0].onPress();
      endProvisionalSession();
      expect(alertSpy).toHaveBeenCalledTimes(2);

      (alertSpy.mock.calls[1][2] as any)[0].onPress();
      alertSpy.mockRestore();
    });
  });

  describe('signOut', () => {
    it('should sign out user and clear token', () => {
      const mockClearUser = jest.fn();
      (useUserStore.getState as jest.Mock).mockReturnValue({
        clearUser: mockClearUser,
      });

      useAuth.getState().signOut();

      expect(removeToken).toHaveBeenCalled();
      expect(mockClearUser).toHaveBeenCalled();

      const state = useAuth.getState();
      expect(state.status).toBe('signOut');
      expect(state.token).toBeNull();
    });

    it('tags authState signedOut', async () => {
      const mockClearUser = jest.fn();
      (useUserStore.getState as jest.Mock).mockReturnValue({
        clearUser: mockClearUser,
      });

      await useAuth.getState().signOut();

      expect(Sentry.setTag).toHaveBeenCalledWith('authState', 'signedOut');
    });

    it('should logout from OneSignal when initialized', async () => {
      (global as any).isOneSignalInitialized = true;
      const mockClearUser = jest.fn();
      (useUserStore.getState as jest.Mock).mockReturnValue({
        clearUser: mockClearUser,
      });

      // Mock OneSignal.User.getExternalId to resolve
      (OneSignal.User.getExternalId as jest.Mock).mockResolvedValue(null);

      // signOut is async, so we need to await it
      await useAuth.getState().signOut();

      expect(OneSignal.logout).toHaveBeenCalled();

      // Fast-forward timers to trigger the setTimeout callback
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Let promises resolve

      expect(OneSignal.User.getExternalId).toHaveBeenCalled();
    });

    it('should handle OneSignal logout errors gracefully', () => {
      (global as any).isOneSignalInitialized = true;
      (OneSignal.logout as jest.Mock).mockImplementation(() => {
        throw new Error('OneSignal error');
      });

      const mockClearUser = jest.fn();
      (useUserStore.getState as jest.Mock).mockReturnValue({
        clearUser: mockClearUser,
      });

      // Should not throw
      expect(() => useAuth.getState().signOut()).not.toThrow();
      expect(removeToken).toHaveBeenCalled();
    });
  });

  describe('hydrate', () => {
    it('should hydrate when token exists and user details fetch succeeds', async () => {
      const mockToken = { access: 'stored-token', refresh: 'stored-refresh' };
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        dailyQuestStreak: 5,
      };

      (getToken as jest.Mock).mockReturnValue(mockToken);
      (getUserDetails as jest.Mock).mockResolvedValue(mockUser);

      const mockSetUser = jest.fn();
      (useUserStore.getState as jest.Mock).mockReturnValue({
        setUser: mockSetUser,
        clearUser: jest.fn(),
      });

      await useAuth.getState().hydrate();

      expect(getToken).toHaveBeenCalled();
      expect(getUserDetails).toHaveBeenCalled();
      expect(mockSetUser).toHaveBeenCalledWith(mockUser);

      const state = useAuth.getState();
      expect(state.status).toBe('signIn');
      expect(state.token).toEqual(mockToken);
    });

    it('tags authState full when a stored token is hydrated successfully', async () => {
      const mockToken = { access: 'stored-token', refresh: 'stored-refresh' };
      const mockUser = { id: 'user-123', name: 'Test User' };

      (getToken as jest.Mock).mockReturnValue(mockToken);
      (getUserDetails as jest.Mock).mockResolvedValue(mockUser);
      (useUserStore.getState as jest.Mock).mockReturnValue({
        setUser: jest.fn(),
        clearUser: jest.fn(),
      });

      await useAuth.getState().hydrate();

      expect(Sentry.setTag).toHaveBeenCalledWith('authState', 'full');
    });

    it('should link OneSignal when user has ID and OneSignal is initialized', async () => {
      (global as any).isOneSignalInitialized = true;
      const mockUser = { id: 'user-456' };

      (getToken as jest.Mock).mockReturnValue({ access: 'token' });
      (getUserDetails as jest.Mock).mockResolvedValue(mockUser);
      (OneSignal.User.getExternalId as jest.Mock).mockResolvedValue('user-456');

      await useAuth.getState().hydrate();

      expect(OneSignal.login).toHaveBeenCalledWith('user-456');

      // Fast-forward timers to trigger the setTimeout callback
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Let promises resolve

      expect(OneSignal.User.getExternalId).toHaveBeenCalled();
    });

    it('should sync character data when available', async () => {
      const mockUser = {
        id: 'user-123',
        character: {
          type: 'alchemist',
          name: 'TestChar',
          level: 5,
          currentXP: 250,
        },
        dailyQuestStreak: 10,
      };

      (getToken as jest.Mock).mockReturnValue({ access: 'token' });
      (getUserDetails as jest.Mock).mockResolvedValue(mockUser);

      // Reset the character store state for this test
      characterStoreMocks.mockGetState.mockReturnValue({
        character: null,
        createCharacter: characterStoreMocks.mockCreateCharacter,
        updateCharacter: characterStoreMocks.mockUpdateCharacter,
        setStreak: characterStoreMocks.mockSetStreak,
      });

      await useAuth.getState().hydrate();

      expect(characterStoreMocks.mockCreateCharacter).toHaveBeenCalledWith(
        'alchemist',
        'TestChar'
      );
      expect(characterStoreMocks.mockUpdateCharacter).toHaveBeenCalledWith({
        type: 'alchemist',
        name: 'TestChar',
        level: 5,
        currentXP: 250,
      });
      expect(characterStoreMocks.mockSetStreak).toHaveBeenCalledWith(10);
    });

    it('should handle character data in legacy format', async () => {
      const mockUser = {
        id: 'user-123',
        type: 'druid',
        name: 'LegacyChar',
        level: 3,
        xp: 150,
      };

      (getToken as jest.Mock).mockReturnValue({ access: 'token' });
      (getUserDetails as jest.Mock).mockResolvedValue(mockUser);

      // Reset the character store state for this test
      characterStoreMocks.mockGetState.mockReturnValue({
        character: null,
        createCharacter: characterStoreMocks.mockCreateCharacter,
        updateCharacter: characterStoreMocks.mockUpdateCharacter,
        setStreak: characterStoreMocks.mockSetStreak,
      });

      await useAuth.getState().hydrate();

      expect(characterStoreMocks.mockCreateCharacter).toHaveBeenCalledWith(
        'druid',
        'LegacyChar'
      );
      expect(characterStoreMocks.mockUpdateCharacter).toHaveBeenCalledWith({
        type: 'druid',
        name: 'LegacyChar',
        level: 3,
        currentXP: 150,
      });
    });

    it('tags authState provisional when only a provisional token exists', async () => {
      (getToken as jest.Mock).mockReturnValue(null);
      (getItem as jest.Mock).mockReturnValue('provisional-access-token');

      await useAuth.getState().hydrate();

      const state = useAuth.getState();
      expect(state.status).toBe('signIn');
      expect(getUserDetails).not.toHaveBeenCalled();
      expect(Sentry.setTag).toHaveBeenCalledWith('authState', 'provisional');
    });

    it('should set signOut status when no token exists', async () => {
      (getToken as jest.Mock).mockReturnValue(null);
      (getItem as jest.Mock).mockReturnValue(null); // No provisional tokens either

      await useAuth.getState().hydrate();

      const state = useAuth.getState();
      expect(state.status).toBe('signOut');
      expect(state.token).toBeNull();
      expect(getUserDetails).not.toHaveBeenCalled();
    });

    it('tags authState signedOut when no token exists', async () => {
      (getToken as jest.Mock).mockReturnValue(null);
      (getItem as jest.Mock).mockReturnValue(null); // No provisional tokens either

      await useAuth.getState().hydrate();

      expect(Sentry.setTag).toHaveBeenCalledWith('authState', 'signedOut');
    });

    it('should keep user signed in when user details fetch fails', async () => {
      (getToken as jest.Mock).mockReturnValue({ access: 'token' });
      (getUserDetails as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const signOutSpy = jest.spyOn(useAuth.getState(), 'signOut');

      await useAuth.getState().hydrate();

      expect(getUserDetails).toHaveBeenCalled();
      // The implementation now keeps the user signed in on fetch failure
      expect(signOutSpy).not.toHaveBeenCalled();

      // When a token exists but the user-details fetch fails, the implementation
      // intentionally sets status to 'signIn' so the app can proceed offline
      // (see the "CRITICAL: Must set status to signIn" path in hydrate()).
      const state = useAuth.getState();
      expect(state.status).toBe('signIn');
      expect(state.token).toEqual({ access: 'token' });
    });

    it('tags authState full when the stored token is kept despite a fetch failure', async () => {
      (getToken as jest.Mock).mockReturnValue({ access: 'token' });
      (getUserDetails as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await useAuth.getState().hydrate();

      expect(Sentry.setTag).toHaveBeenCalledWith('authState', 'full');
    });

    it('should handle hydration errors gracefully', async () => {
      (getToken as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const signOutSpy = jest.spyOn(useAuth.getState(), 'signOut');

      await useAuth.getState().hydrate();

      // The implementation sets status to signOut but doesn't call signOut method
      expect(signOutSpy).not.toHaveBeenCalled();

      // But it should set the status to signOut
      const state = useAuth.getState();
      expect(state.status).toBe('signOut');
    });

    it('tags authState signedOut when hydration itself throws', async () => {
      (getToken as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      await useAuth.getState().hydrate();

      expect(Sentry.setTag).toHaveBeenCalledWith('authState', 'signedOut');
    });

    it('should use maestro tokens in development when available', async () => {
      const maestroToken = 'maestro-access-token';
      const maestroRefresh = 'maestro-refresh-token';

      // Set up the environment
      (global as any).__DEV__ = true;
      Constants.expoConfig!.extra = {
        maestroAccessToken: maestroToken,
        maestroRefreshToken: maestroRefresh,
      };

      (getToken as jest.Mock).mockReturnValue({ access: maestroToken });
      (getUserDetails as jest.Mock).mockResolvedValue({ id: 'test-user' });

      await useAuth.getState().hydrate();

      expect(storeTokens).toHaveBeenCalledWith({
        access: {
          token: maestroToken,
          expires: expect.any(String),
        },
        refresh: {
          token: maestroRefresh,
          expires: expect.any(String),
        },
      });
    });

    it('should not create character if it already exists locally', async () => {
      const mockUser = {
        id: 'user-123',
        character: {
          type: 'alchemist',
          name: 'TestChar',
          level: 5,
          currentXP: 250,
        },
      };

      (getToken as jest.Mock).mockReturnValue({ access: 'token' });
      (getUserDetails as jest.Mock).mockResolvedValue(mockUser);

      // Set character already exists
      characterStoreMocks.mockGetState.mockReturnValue({
        character: { type: 'alchemist', name: 'ExistingChar' }, // Character already exists
        createCharacter: characterStoreMocks.mockCreateCharacter,
        updateCharacter: characterStoreMocks.mockUpdateCharacter,
        setStreak: characterStoreMocks.mockSetStreak,
      });

      await useAuth.getState().hydrate();

      expect(characterStoreMocks.mockCreateCharacter).not.toHaveBeenCalled();
      expect(characterStoreMocks.mockUpdateCharacter).toHaveBeenCalled();
    });
  });
});
