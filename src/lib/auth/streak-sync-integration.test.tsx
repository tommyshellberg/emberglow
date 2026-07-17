import { act, renderHook } from '@testing-library/react-native';

import { getUserDetails } from '@/lib/services/user';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';

// Mock dependencies
jest.mock('@/lib/services/user');
jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock quest timer
jest.mock('@/lib/services/quest-timer', () => ({
  QuestTimer: {
    prepareQuest: jest.fn(),
    onPhoneLocked: jest.fn(),
    onPhoneUnlocked: jest.fn(),
  },
}));

// Mock navigation
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('Streak Sync Integration Tests', () => {
  const mockGetUserDetails = getUserDetails as jest.MockedFunction<
    typeof getUserDetails
  >;

  // Fix Date to a safe mid-day instant so the "N hours/days ago" arithmetic
  // below can't straddle a local calendar-day boundary depending on when the
  // suite happens to run (it was flipping the wrong side of the boundary
  // during the last hour of the local day). Real timers stay real so
  // Testing Library's act()/scheduling is unaffected.
  const FIXED_NOW = new Date(2026, 6, 15, 12, 0, 0);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({
      doNotFake: [
        'nextTick',
        'setImmediate',
        'setInterval',
        'setTimeout',
        'queueMicrotask',
      ],
    });
    jest.setSystemTime(FIXED_NOW);

    // Reset stores
    useCharacterStore.setState({
      selectedCharacter: {
        id: 'knight',
        name: 'Test Knight',
        title: 'The Brave',
        backstory: 'A test knight',
        xp: 0,
        level: 1,
        description: 'Test description',
        profileImage: 'knight-profile.jpg',
        fullImage: 'knight-full.jpg',
      },
      dailyQuestStreak: 0,
      lastStreakCelebrationShown: null,
    });

    useQuestStore.setState({
      questRuns: [],
      completedQuests: [],
      lastCompletedQuestTimestamp: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Optimistic updates with server reconciliation', () => {
    test('local streak should be overwritten by server value on next sync', async () => {
      const { result: characterResult } = renderHook(() => useCharacterStore());

      // Initial state: streak is 5
      act(() => {
        characterResult.current.setStreak(5);
      });
      expect(characterResult.current.dailyQuestStreak).toBe(5);

      // Simulate completing a quest by updating the streak directly
      // (In real app, this happens when completeQuest is called)
      act(() => {
        // Set last completed timestamp to 23 hours ago (within streak window)
        const lastQuestTimestamp = Date.now() - 23 * 60 * 60 * 1000;
        useQuestStore.setState({
          lastCompletedQuestTimestamp: lastQuestTimestamp,
        });
        // Update streak as if quest was completed
        characterResult.current.updateStreak(lastQuestTimestamp);
      });

      // Verify optimistic update happened
      expect(characterResult.current.dailyQuestStreak).toBe(6);

      // Simulate server sync returning different value
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        dailyQuestStreak: 3, // Server says streak is actually 3
        character: {
          type: 'knight',
          name: 'Test Knight',
          level: 1,
          currentXP: 50,
          xpToNextLevel: 100,
        },
      };

      mockGetUserDetails.mockResolvedValue(mockUser);

      // Simulate a sync (e.g., navigating to profile)
      act(() => {
        // In real app, this would happen during navigation or refresh
        characterResult.current.setStreak(mockUser.dailyQuestStreak);
      });

      // Verify server value overwrites optimistic update
      expect(characterResult.current.dailyQuestStreak).toBe(3);
    });

    test('streak should remain consistent when server agrees with local', async () => {
      const { result: characterResult } = renderHook(() => useCharacterStore());

      // Initial state: streak is 10
      act(() => {
        characterResult.current.setStreak(10);
      });

      // Simulate completing a quest
      act(() => {
        const lastQuestTimestamp = Date.now() - 23 * 60 * 60 * 1000;
        useQuestStore.setState({
          lastCompletedQuestTimestamp: lastQuestTimestamp,
        });
        characterResult.current.updateStreak(lastQuestTimestamp);
      });

      expect(characterResult.current.dailyQuestStreak).toBe(11);

      // Server agrees with local calculation
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        dailyQuestStreak: 11, // Server agrees
        character: {
          type: 'knight',
          name: 'Test Knight',
          level: 1,
          currentXP: 50,
          xpToNextLevel: 100,
        },
      };

      mockGetUserDetails.mockResolvedValue(mockUser);

      // Simulate sync
      act(() => {
        characterResult.current.setStreak(mockUser.dailyQuestStreak);
      });

      // Streak remains the same
      expect(characterResult.current.dailyQuestStreak).toBe(11);
    });

    test('streak reset should be handled correctly', async () => {
      const { result: characterResult } = renderHook(() => useCharacterStore());

      // Initial state: high streak
      act(() => {
        characterResult.current.setStreak(30);
      });

      // Simulate completing a quest after missing days
      act(() => {
        const threeDaysAgo = Date.now() - 72 * 60 * 60 * 1000;
        useQuestStore.setState({
          lastCompletedQuestTimestamp: threeDaysAgo,
        });
        characterResult.current.updateStreak(threeDaysAgo);
      });

      // Local calculation resets to 1
      expect(characterResult.current.dailyQuestStreak).toBe(1);

      // Server confirms the reset
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        dailyQuestStreak: 1, // Server also reset
        character: {
          type: 'knight',
          name: 'Test Knight',
          level: 1,
          currentXP: 50,
          xpToNextLevel: 100,
        },
      };

      mockGetUserDetails.mockResolvedValue(mockUser);

      act(() => {
        characterResult.current.setStreak(mockUser.dailyQuestStreak);
      });

      expect(characterResult.current.dailyQuestStreak).toBe(1);
    });
  });

  describe('Multiple device scenarios', () => {
    test('device streak should sync to server value', async () => {
      const { result: device } = renderHook(() => useCharacterStore());

      // Device starts with streak 5
      act(() => {
        device.current.setStreak(5);
      });
      expect(device.current.dailyQuestStreak).toBe(5);

      // User completes a quest on this device (optimistic update to 6)
      act(() => {
        device.current.updateStreak(Date.now() - 23 * 60 * 60 * 1000);
      });
      expect(device.current.dailyQuestStreak).toBe(6);

      // Meanwhile, another device also completed a quest and server processed both
      // Server returns updated streak value
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        dailyQuestStreak: 7, // Server calculated based on all devices
        character: {
          type: 'knight',
          name: 'Test Knight',
          level: 1,
          currentXP: 100,
          xpToNextLevel: 200,
        },
      };

      // When this device syncs (e.g., on app resume), it gets server value
      act(() => {
        device.current.setStreak(mockUser.dailyQuestStreak);
      });

      // Device now shows server's authoritative value
      expect(device.current.dailyQuestStreak).toBe(7);
    });
  });

  describe('Provisional to full user transition', () => {
    test('provisional user streak should persist after signup', async () => {
      const { result: characterResult } = renderHook(() => useCharacterStore());

      // Provisional user completes quests and builds streak
      act(() => {
        characterResult.current.setStreak(0);
      });

      // Simulate completing 3 quests over 3 days as provisional user
      // Day 1
      act(() => {
        characterResult.current.updateStreak(null); // First quest ever
      });
      expect(characterResult.current.dailyQuestStreak).toBe(1);

      // Day 2
      act(() => {
        const oneDayAgo = Date.now() - 23 * 60 * 60 * 1000;
        characterResult.current.updateStreak(oneDayAgo);
      });
      expect(characterResult.current.dailyQuestStreak).toBe(2);

      // Day 3
      act(() => {
        const oneDayAgo = Date.now() - 23 * 60 * 60 * 1000;
        characterResult.current.updateStreak(oneDayAgo);
      });
      expect(characterResult.current.dailyQuestStreak).toBe(3);

      // User completes signup, server returns their data
      const mockUser = {
        id: 'full-user-123',
        email: 'user@example.com',
        name: 'New User',
        role: 'user' as const,
        dailyQuestStreak: 3, // Server preserved the streak
        character: {
          type: 'knight',
          name: 'Test Knight',
          level: 1,
          currentXP: 150,
          xpToNextLevel: 100,
        },
      };

      mockGetUserDetails.mockResolvedValue(mockUser);

      // Sync after becoming full user
      act(() => {
        characterResult.current.setStreak(mockUser.dailyQuestStreak);
      });

      expect(characterResult.current.dailyQuestStreak).toBe(3);
    });
  });

  describe('Error handling', () => {
    test('should maintain local streak when server sync fails', async () => {
      const { result: characterResult } = renderHook(() => useCharacterStore());

      // Set initial streak
      act(() => {
        characterResult.current.setStreak(15);
      });

      // Complete a quest
      act(() => {
        characterResult.current.updateStreak(Date.now() - 23 * 60 * 60 * 1000);
      });
      expect(characterResult.current.dailyQuestStreak).toBe(16);

      // Server call fails
      mockGetUserDetails.mockRejectedValue(new Error('Network error'));

      // Streak should remain at local value
      expect(characterResult.current.dailyQuestStreak).toBe(16);

      // Later, when network recovers and sync succeeds
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        dailyQuestStreak: 16, // Server eventually processed it
        character: {
          type: 'knight',
          name: 'Test Knight',
          level: 1,
          currentXP: 50,
          xpToNextLevel: 100,
        },
      };

      mockGetUserDetails.mockResolvedValue(mockUser);

      act(() => {
        characterResult.current.setStreak(mockUser.dailyQuestStreak);
      });

      expect(characterResult.current.dailyQuestStreak).toBe(16);
    });
  });

  describe('Streak calculation edge cases', () => {
    test('should handle same day quest completion', () => {
      const { result: characterResult } = renderHook(() => useCharacterStore());

      // Set initial streak
      act(() => {
        characterResult.current.setStreak(5);
      });

      // Complete another quest on the same day - use noon today as the previous completion
      // to avoid midnight boundary issues
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      act(() => {
        characterResult.current.updateStreak(today.getTime());
      });

      // Streak should not increase for same day
      expect(characterResult.current.dailyQuestStreak).toBe(5);
    });

    test('should reset streak after missing a calendar day', () => {
      const { result: characterResult } = renderHook(() => useCharacterStore());

      // Set initial streak
      act(() => {
        characterResult.current.setStreak(10);
      });

      // Complete quest after missing a day (2+ calendar days ago)
      const now = new Date();
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      act(() => {
        characterResult.current.updateStreak(twoDaysAgo.getTime());
      });

      // Streak should reset to 1
      expect(characterResult.current.dailyQuestStreak).toBe(1);
    });
  });
});
