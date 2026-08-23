import * as Sentry from '@sentry/react-native';

import { getItem, setItem } from '@/lib/storage';

import { useUserStore } from './user-store';

// Mock storage (persist middleware reads/writes through this)
jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  setUser: jest.fn(),
}));

const STORAGE_KEY = 'user-storage';

const aUser = () =>
  ({
    id: 'user-abc-123',
    email: 'secret@example.com',
    featureFlags: ['beta'],
  }) as any;

describe('user-store', () => {
  beforeEach(() => {
    useUserStore.setState({ user: null });
    jest.clearAllMocks();
    (getItem as jest.Mock).mockReturnValue(null);
  });

  describe('Sentry correlation', () => {
    it('setUser reports id-only to Sentry (never email)', () => {
      useUserStore.getState().setUser(aUser());
      // toHaveBeenCalledWith is an exact match: it fails if email is included.
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user-abc-123' });
    });

    it('clearUser clears the Sentry user', () => {
      useUserStore.getState().clearUser();
      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  // These assert the state transition itself. Without them `set({ user })` can
  // be replaced by `set({})` and the Sentry tests above still pass — sign-in
  // and account-wipe would both be reported to Sentry and then dropped.
  describe('state', () => {
    it('setUser puts the user in the store', () => {
      const user = aUser();

      useUserStore.getState().setUser(user);

      expect(useUserStore.getState().user).toEqual(user);
    });

    it('clearUser empties the store', () => {
      useUserStore.getState().setUser(aUser());

      useUserStore.getState().clearUser();

      expect(useUserStore.getState().user).toBeNull();
    });

    it('updateUser merges into the existing user', () => {
      useUserStore.getState().setUser(aUser());

      useUserStore.getState().updateUser({ email: 'new@example.com' });

      expect(useUserStore.getState().user).toEqual({
        ...aUser(),
        email: 'new@example.com',
      });
    });

    it('updateUser leaves a signed-out store signed out', () => {
      // The other direction of the `state.user ? … : null` branch. Without it
      // a mutant that always merges would spawn a user out of nothing.
      useUserStore.getState().updateUser({ email: 'new@example.com' });

      expect(useUserStore.getState().user).toBeNull();
    });
  });

  describe('persistence', () => {
    it('writes the user under the pinned storage key', () => {
      useUserStore.getState().setUser(aUser());

      expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
      const written = JSON.parse(
        (setItem as jest.Mock).mock.calls.at(-1)![1] as string
      );
      expect(written.state.user.id).toBe('user-abc-123');
    });

    it('rehydrates the user written by a previous launch', () => {
      // Blanking the key here is what logs every existing user out on upgrade.
      (getItem as jest.Mock).mockImplementation((name: string) =>
        name === STORAGE_KEY
          ? JSON.stringify({ state: { user: aUser() }, version: 0 })
          : null
      );

      let store: typeof useUserStore;
      jest.isolateModules(() => {
        store = require('./user-store').useUserStore as typeof useUserStore;
      });

      expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
      expect(store!.getState().user).toEqual(aUser());
    });
  });
});
