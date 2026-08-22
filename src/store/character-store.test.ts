import { act, renderHook } from '@testing-library/react-native';

import { useCharacterStore } from './character-store';

// Mock storage
jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock the level progression data
jest.mock('@/app/data/level-progression', () => ({
  levels: [
    { level: 1, totalXPRequired: 0 },
    { level: 2, totalXPRequired: 100 },
    { level: 3, totalXPRequired: 250 },
    { level: 4, totalXPRequired: 475 },
    { level: 5, totalXPRequired: 812 },
  ],
}));

describe('Character Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    useCharacterStore.setState({
      character: null,
      dailyQuestStreak: 0,
      lastStreakCelebrationShown: null,
    });
    jest.clearAllMocks();
  });

  describe('XP and Level Management', () => {
    beforeEach(() => {
      // Create a test character at level 1
      act(() => {
        useCharacterStore.getState().createCharacter('knight', 'Test Knight');
      });
    });

    test('should start at level 1 with 0 total XP', () => {
      const { result } = renderHook(() => useCharacterStore());

      expect(result.current.character?.level).toBe(1);
      expect(result.current.character?.currentXP).toBe(0);
    });

    test('should add XP correctly without leveling up', () => {
      const { result } = renderHook(() => useCharacterStore());

      act(() => {
        result.current.addXP(50);
      });

      expect(result.current.character?.currentXP).toBe(50);
      expect(result.current.character?.level).toBe(1);
    });

    test('should level up from 1 to 2 at 100 total XP', () => {
      const { result } = renderHook(() => useCharacterStore());

      act(() => {
        result.current.addXP(100);
      });

      expect(result.current.character?.currentXP).toBe(100);
      expect(result.current.character?.level).toBe(2);
    });

    test('should handle multiple level ups correctly', () => {
      const { result } = renderHook(() => useCharacterStore());

      // Add 300 XP at once (should go from level 1 to level 3)
      act(() => {
        result.current.addXP(300);
      });

      expect(result.current.character?.currentXP).toBe(300);
      expect(result.current.character?.level).toBe(3);
    });

    test('should accumulate XP across multiple additions', () => {
      const { result } = renderHook(() => useCharacterStore());

      act(() => {
        result.current.addXP(50);
      });
      expect(result.current.character?.currentXP).toBe(50);
      expect(result.current.character?.level).toBe(1);

      act(() => {
        result.current.addXP(75);
      });
      expect(result.current.character?.currentXP).toBe(125);
      expect(result.current.character?.level).toBe(2);

      act(() => {
        result.current.addXP(125);
      });
      expect(result.current.character?.currentXP).toBe(250);
      expect(result.current.character?.level).toBe(3);
    });

    test('should handle edge case at exact level threshold', () => {
      const { result } = renderHook(() => useCharacterStore());

      // Exactly 250 XP should be level 3
      act(() => {
        result.current.addXP(250);
      });

      expect(result.current.character?.currentXP).toBe(250);
      expect(result.current.character?.level).toBe(3);
    });

    test('should not add XP if character is null', () => {
      const { result } = renderHook(() => useCharacterStore());

      // Reset character to null
      act(() => {
        result.current.resetCharacter();
      });

      act(() => {
        result.current.addXP(100);
      });

      expect(result.current.character).toBeNull();
    });

    test('should handle updateCharacter with server data', () => {
      const { result } = renderHook(() => useCharacterStore());

      // Simulate server sync with different XP
      act(() => {
        result.current.updateCharacter({
          level: 2,
          currentXP: 150,
        });
      });

      expect(result.current.character?.level).toBe(2);
      expect(result.current.character?.currentXP).toBe(150);
    });
  });

  describe('Streak Management', () => {
    test('should update dailyQuestStreak value', () => {
      const { result } = renderHook(() => useCharacterStore());

      act(() => {
        result.current.setStreak(10);
      });

      expect(result.current.dailyQuestStreak).toBe(10);
    });

    test('should handle zero value', () => {
      const { result } = renderHook(() => useCharacterStore());

      // Set initial streak
      act(() => {
        result.current.setStreak(5);
      });

      // Reset to zero
      act(() => {
        result.current.setStreak(0);
      });

      expect(result.current.dailyQuestStreak).toBe(0);
    });

    test('should handle large streak values', () => {
      const { result } = renderHook(() => useCharacterStore());

      act(() => {
        result.current.setStreak(365); // One year streak
      });

      expect(result.current.dailyQuestStreak).toBe(365);
    });

    test('should update multiple times correctly', () => {
      const { result } = renderHook(() => useCharacterStore());

      act(() => {
        result.current.setStreak(1);
      });
      expect(result.current.dailyQuestStreak).toBe(1);

      act(() => {
        result.current.setStreak(5);
      });
      expect(result.current.dailyQuestStreak).toBe(5);

      act(() => {
        result.current.setStreak(3);
      });
      expect(result.current.dailyQuestStreak).toBe(3);
    });

    test('should not affect character XP when updating streak', () => {
      const { result } = renderHook(() => useCharacterStore());

      // Create character with some XP
      act(() => {
        useCharacterStore.getState().createCharacter('druid', 'Test Druid');
        result.current.addXP(100);
      });

      const xpBefore = result.current.character?.currentXP;

      // Update streak
      act(() => {
        result.current.setStreak(10);
      });

      // Verify only streak changed
      expect(result.current.dailyQuestStreak).toBe(10);
      expect(result.current.character?.currentXP).toBe(xpBefore);
    });
  });

  describe('updateStreak', () => {
    const at = (y: number, m: number, d: number, h = 12) =>
      new Date(y, m - 1, d, h, 0, 0, 0).getTime();

    test('null previous completion starts at 1, ignoring any existing streak', () => {
      const { result } = renderHook(() => useCharacterStore());
      act(() => useCharacterStore.setState({ dailyQuestStreak: 7 }));
      act(() => result.current.updateStreak(null, at(2026, 3, 3)));
      expect(result.current.dailyQuestStreak).toBe(1);
    });

    test('same local day keeps the streak', () => {
      const { result } = renderHook(() => useCharacterStore());
      act(() => useCharacterStore.setState({ dailyQuestStreak: 5 }));
      act(() =>
        result.current.updateStreak(at(2026, 3, 3, 8), at(2026, 3, 3, 20))
      );
      expect(result.current.dailyQuestStreak).toBe(5);
    });

    test('same local day with a stored 0 becomes 1', () => {
      const { result } = renderHook(() => useCharacterStore());
      act(() => useCharacterStore.setState({ dailyQuestStreak: 0 }));
      act(() =>
        result.current.updateStreak(at(2026, 3, 3, 8), at(2026, 3, 3, 20))
      );
      expect(result.current.dailyQuestStreak).toBe(1);
    });

    test('next local day adds one', () => {
      const { result } = renderHook(() => useCharacterStore());
      act(() => useCharacterStore.setState({ dailyQuestStreak: 5 }));
      act(() => result.current.updateStreak(at(2026, 3, 2), at(2026, 3, 3)));
      expect(result.current.dailyQuestStreak).toBe(6);
    });

    test('23:59 then 00:01 is the next day', () => {
      const { result } = renderHook(() => useCharacterStore());
      act(() => useCharacterStore.setState({ dailyQuestStreak: 5 }));
      const prev = new Date(2026, 2, 2, 23, 59).getTime();
      const now = new Date(2026, 2, 3, 0, 1).getTime();
      act(() => result.current.updateStreak(prev, now));
      expect(result.current.dailyQuestStreak).toBe(6);
    });

    test('more than 25 hours later but still the next calendar day adds one', () => {
      const { result } = renderHook(() => useCharacterStore());
      act(() => useCharacterStore.setState({ dailyQuestStreak: 5 }));
      act(() =>
        result.current.updateStreak(at(2026, 3, 2, 8), at(2026, 3, 3, 23))
      );
      expect(result.current.dailyQuestStreak).toBe(6);
    });

    test('a gap of two calendar days resets to 1', () => {
      const { result } = renderHook(() => useCharacterStore());
      act(() => useCharacterStore.setState({ dailyQuestStreak: 10 }));
      act(() => result.current.updateStreak(at(2026, 3, 1), at(2026, 3, 3)));
      expect(result.current.dailyQuestStreak).toBe(1);
    });

    test('the spring daylight-saving night (23 hours) is still one day', () => {
      // Jest runs in the machine timezone; the Date.UTC-of-local-parts rule makes the
      // result independent of whether that zone observes DST, so this test is stable.
      const { result } = renderHook(() => useCharacterStore());
      act(() => useCharacterStore.setState({ dailyQuestStreak: 5 }));
      act(() =>
        result.current.updateStreak(at(2026, 3, 7, 12), at(2026, 3, 8, 11))
      );
      expect(result.current.dailyQuestStreak).toBe(6);
    });
  });

  describe('Streak sync scenarios', () => {
    test('server streak should overwrite local optimistic update', () => {
      const { result } = renderHook(() => useCharacterStore());

      // Local optimistic update (e.g., after quest completion)
      act(() => {
        result.current.updateStreak(Date.now() - 25 * 60 * 60 * 1000);
      });
      expect(result.current.dailyQuestStreak).toBe(1);

      // Server sync returns different value
      act(() => {
        result.current.setStreak(5);
      });

      expect(result.current.dailyQuestStreak).toBe(5);
    });

    test('should handle server returning lower streak than local', () => {
      const { result } = renderHook(() => useCharacterStore());

      // Set high local streak
      act(() => {
        useCharacterStore.setState({ dailyQuestStreak: 10 });
      });

      // Server returns lower value (e.g., missed day was detected)
      act(() => {
        result.current.setStreak(1);
      });

      expect(result.current.dailyQuestStreak).toBe(1);
    });
  });
});
