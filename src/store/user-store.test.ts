import * as Sentry from '@sentry/react-native';

import { useUserStore } from './user-store';

// Mock storage (persist middleware reads/writes through this)
jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  setUser: jest.fn(),
}));

describe('user-store Sentry correlation', () => {
  beforeEach(() => {
    useUserStore.setState({ user: null });
    jest.clearAllMocks();
  });

  it('setUser reports id-only to Sentry (never email)', () => {
    useUserStore.getState().setUser({
      id: 'user-abc-123',
      email: 'secret@example.com',
    } as any);
    // toHaveBeenCalledWith is an exact match: it fails if email is included.
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user-abc-123' });
  });

  it('clearUser clears the Sentry user', () => {
    useUserStore.getState().clearUser();
    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });
});
