import { useCharacterStore } from '@/store/character-store';
import { useUserStore } from '@/store/user-store';

jest.mock('@sentry/react-native', () => ({ setUser: jest.fn() }));
jest.mock('@/lib/services/user', () => ({ getUserDetails: jest.fn() }));
jest.mock('@/lib/storage', () => {
  const actual = jest.requireActual('@/lib/storage');
  return { ...actual, getItem: jest.fn(actual.getItem) };
});

const { getUserDetails } = require('@/lib/services/user');
const { getItem } = require('@/lib/storage');
const { refreshUser, syncCharacterFromUser } = require('./refresh-user');

const serverUser = {
  id: 'u1',
  email: 'a@b.c',
  role: 'user',
  type: 'knight',
  name: 'Ser Test',
  level: 3,
  xp: 420,
  dailyQuestStreak: 12,
  featureFlags: [],
  hasPremiumAccess: false,
  isProvisional: false,
  createdAt: new Date('2026-01-01'),
  completedQuests: [],
  friends: [],
  pendingFriends: [],
  blockedUsers: [],
  inventory: [],
};

describe('syncCharacterFromUser', () => {
  beforeEach(() => {
    useCharacterStore.setState({ character: null, dailyQuestStreak: 0 });
  });

  it('creates the character when missing and applies the streak', () => {
    syncCharacterFromUser(serverUser);
    expect(useCharacterStore.getState().character).toMatchObject({
      type: 'knight',
      name: 'Ser Test',
      level: 3,
      currentXP: 420,
    });
    expect(useCharacterStore.getState().dailyQuestStreak).toBe(12);
  });

  it('overwrites a higher local streak with the server value', () => {
    useCharacterStore.setState({ dailyQuestStreak: 40 });
    syncCharacterFromUser(serverUser);
    expect(useCharacterStore.getState().dailyQuestStreak).toBe(12);
  });

  it('applies a server streak of 0', () => {
    useCharacterStore.setState({ dailyQuestStreak: 40 });
    syncCharacterFromUser({ ...serverUser, dailyQuestStreak: 0 });
    expect(useCharacterStore.getState().dailyQuestStreak).toBe(0);
  });

  it('leaves the streak alone when the server omits it', () => {
    useCharacterStore.setState({ dailyQuestStreak: 40 });
    syncCharacterFromUser({ ...serverUser, dailyQuestStreak: undefined as any });
    expect(useCharacterStore.getState().dailyQuestStreak).toBe(40);
  });
});

describe('refreshUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCharacterStore.setState({ character: null, dailyQuestStreak: 40 });
    (getItem as jest.Mock).mockImplementation((key: string) =>
      key === 'provisionalAccessToken' ? null : undefined
    );
  });

  it('fetches the user and applies the server streak', async () => {
    (getUserDetails as jest.Mock).mockResolvedValue(serverUser);
    await refreshUser();
    expect(useCharacterStore.getState().dailyQuestStreak).toBe(12);
    expect(useUserStore.getState().user).toMatchObject({ id: 'u1' });
  });

  it('does nothing for provisional users', async () => {
    (getItem as jest.Mock).mockImplementation((key: string) =>
      key === 'provisionalAccessToken' ? 'tok' : undefined
    );
    await refreshUser();
    expect(getUserDetails).not.toHaveBeenCalled();
    expect(useCharacterStore.getState().dailyQuestStreak).toBe(40);
  });

  it('swallows network errors and keeps the local value', async () => {
    (getUserDetails as jest.Mock).mockRejectedValue(new Error('offline'));
    await expect(refreshUser()).resolves.toBeUndefined();
    expect(useCharacterStore.getState().dailyQuestStreak).toBe(40);
  });
});
