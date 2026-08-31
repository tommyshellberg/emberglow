import { renderHook } from '@testing-library/react-native';

import type { QuestWithMode } from '@/components/quest-complete/types';

import { useCustomQuestStory } from './useCustomQuestStory';

describe('useCustomQuestStory', () => {
  describe('story quests', () => {
    it('should return null for story quests', () => {
      const quest: QuestWithMode = {
        id: 'quest-1',
        mode: 'story',
        title: 'Story Quest',
        durationMinutes: 5,
        reward: { xp: 10 },
        status: 'pending',
      };

      const { result } = renderHook(() => useCustomQuestStory(quest));
      expect(result.current).toBeNull();
    });
  });

  describe('custom quests with matching category', () => {
    it('should return story for fitness category', () => {
      const quest: QuestWithMode = {
        id: 'custom-quest-123',
        mode: 'custom',
        category: 'fitness',
        title: 'Morning Run',
        durationMinutes: 30,
        reward: { xp: 50 },
        status: 'pending',
      };

      const { result } = renderHook(() => useCustomQuestStory(quest));
      expect(result.current).toBeTruthy();
      expect(typeof result.current).toBe('string');
      expect(result.current!.length).toBeGreaterThan(0);
    });

    it('should return story for reading category', () => {
      const quest: QuestWithMode = {
        id: 'custom-quest-456',
        mode: 'custom',
        category: 'reading',
        title: 'Book Time',
        durationMinutes: 60,
        reward: { xp: 100 },
        status: 'pending',
      };

      const { result } = renderHook(() => useCustomQuestStory(quest));
      expect(result.current).toBeTruthy();
      expect(typeof result.current).toBe('string');
    });

    it('should return story for self-care category', () => {
      const quest: QuestWithMode = {
        id: 'custom-quest-789',
        mode: 'custom',
        category: 'self-care',
        title: 'Meditation',
        durationMinutes: 15,
        reward: { xp: 25 },
        status: 'pending',
      };

      const { result } = renderHook(() => useCustomQuestStory(quest));
      expect(result.current).toBeTruthy();
      expect(typeof result.current).toBe('string');
    });

    it('should return story for social category', () => {
      const quest: QuestWithMode = {
        id: 'custom-quest-abc',
        mode: 'custom',
        category: 'social',
        title: 'Coffee with Friend',
        durationMinutes: 45,
        reward: { xp: 75 },
        status: 'pending',
      };

      const { result } = renderHook(() => useCustomQuestStory(quest));
      expect(result.current).toBeTruthy();
      expect(typeof result.current).toBe('string');
    });

    it('should return story for learning category', () => {
      const quest: QuestWithMode = {
        id: 'custom-quest-def',
        mode: 'custom',
        category: 'learning',
        title: 'Online Course',
        durationMinutes: 90,
        reward: { xp: 150 },
        status: 'pending',
      };

      const { result } = renderHook(() => useCustomQuestStory(quest));
      expect(result.current).toBeTruthy();
      expect(typeof result.current).toBe('string');
    });
  });

  describe('holdout quests', () => {
    it('should return a category-matched story for holdout quests', () => {
      const quest: QuestWithMode = {
        id: 'holdout-quest-1',
        mode: 'holdout',
        category: 'fitness',
        title: 'Hold Out',
        durationMinutes: 10,
        reward: { xp: 0 },
        status: 'pending',
      };

      const { result } = renderHook(() => useCustomQuestStory(quest));
      expect(result.current).toBeTruthy();
      expect(typeof result.current).toBe('string');
    });
  });

  describe('case insensitivity', () => {
    it('should match category case-insensitively', () => {
      const quest: QuestWithMode = {
        id: 'custom-quest-case',
        mode: 'custom',
        category: 'FITNESS', // Uppercase
        title: 'Workout',
        durationMinutes: 30,
        reward: { xp: 50 },
        status: 'pending',
      };

      const { result } = renderHook(() => useCustomQuestStory(quest));
      expect(result.current).toBeTruthy();
    });
  });

  describe('consistency', () => {
    it('should return same story for same quest id', () => {
      const quest: QuestWithMode = {
        id: 'consistent-quest',
        mode: 'custom',
        category: 'fitness',
        title: 'Test',
        durationMinutes: 30,
        reward: { xp: 50 },
        status: 'pending',
      };

      const { result: result1 } = renderHook(() => useCustomQuestStory(quest));
      const { result: result2 } = renderHook(() => useCustomQuestStory(quest));

      expect(result1.current).toBe(result2.current);
    });
  });

  describe('fallback behavior', () => {
    it('should handle category with no matching stories', () => {
      const quest: QuestWithMode = {
        id: 'custom-quest-unknown',
        mode: 'custom',
        category: 'unknown-category' as any,
        title: 'Unknown',
        durationMinutes: 30,
        reward: { xp: 50 },
        status: 'pending',
      };

      const { result } = renderHook(() => useCustomQuestStory(quest));
      // Should fall back to random category
      expect(result.current).toBeTruthy();
      expect(typeof result.current).toBe('string');
    });

    it('should handle quest without category', () => {
      const quest: QuestWithMode = {
        id: 'custom-quest-no-cat',
        mode: 'custom',
        title: 'No Category',
        durationMinutes: 30,
        reward: { xp: 50 },
        status: 'pending',
      };

      const { result } = renderHook(() => useCustomQuestStory(quest));
      // Should fall back to random category
      expect(result.current).toBeTruthy();
    });
  });

  describe('cooperative quests', () => {
    it('should return null for cooperative quests', () => {
      const quest: QuestWithMode = {
        id: 'coop-quest-123',
        mode: 'cooperative',
        category: 'cooperative',
        title: 'Team Quest',
        durationMinutes: 45,
        reward: { xp: 75 },
        status: 'pending',
      };

      const { result } = renderHook(() => useCustomQuestStory(quest));
      expect(result.current).toBeNull();
    });
  });

  describe('memoization', () => {
    it('should memoize result for same quest', () => {
      const quest: QuestWithMode = {
        id: 'memo-quest',
        mode: 'custom',
        category: 'fitness',
        title: 'Test',
        durationMinutes: 30,
        reward: { xp: 50 },
        status: 'pending',
      };

      const { result, rerender } = renderHook(() => useCustomQuestStory(quest));
      const firstResult = result.current;

      // Rerender with same quest
      rerender();

      expect(result.current).toBe(firstResult);
    });
  });
});
