import { renderHook } from '@testing-library/react-native';

import { useHomeData } from './use-home-data';

// Mock getMapNameForQuest
jest.mock('@/app/utils/map-utils', () => ({
  getMapNameForQuest: jest.fn((questId: string) => {
    if (questId.startsWith('quest-')) return 'Vaedros Kingdom';
    return 'Unknown Map';
  }),
}));

describe('useHomeData', () => {
  describe('Carousel Data Generation', () => {
    it('should generate carousel data with server quest', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [
            {
              customId: 'quest-1',
              title: 'First Quest',
              recap: 'Begin your adventure',
              durationMinutes: 10,
              reward: { xp: 20 },
              isPremium: false,
            },
          ],
          availableQuests: [],
          storyOptions: [],
          completedQuests: [],
          isLoadingQuests: false,
        })
      );

      expect(result.current.carouselData).toHaveLength(4); // story, custom, coop, holdout
      expect(result.current.carouselData[0]).toMatchObject({
        id: 'story',
        mode: 'story',
        title: 'First Quest',
        recap: 'Begin your adventure',
        duration: 10,
        xp: 20,
        isPremium: false,
      });
    });

    it('should use available quests when no server quests', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [],
          availableQuests: [
            {
              id: 'quest-2',
              title: 'Second Quest',
              mode: 'story',
              durationMinutes: 15,
              reward: { xp: 30 },
            },
          ],
          storyOptions: [],
          completedQuests: [],
          isLoadingQuests: false,
        })
      );

      expect(result.current.carouselData[0]).toMatchObject({
        title: 'Second Quest',
        duration: 15,
        xp: 30,
      });
    });

    it('should show loading state when quests are loading', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [],
          availableQuests: [],
          storyOptions: [],
          completedQuests: [],
          isLoadingQuests: true,
        })
      );

      expect(result.current.carouselData[0].title).toBe('Loading quests...');
    });

    it('should show "No quests available" when no quests', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [],
          availableQuests: [],
          storyOptions: [],
          completedQuests: [],
          isLoadingQuests: false,
        })
      );

      expect(result.current.carouselData[0].title).toBe('No quests available');
    });

    it('should always include custom quest card', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [],
          availableQuests: [],
          storyOptions: [],
          completedQuests: [],
          isLoadingQuests: false,
        })
      );

      const customCard = result.current.carouselData.find(
        (c) => c.id === 'custom'
      );
      expect(customCard).toBeDefined();
      expect(customCard?.title).toBe('Start Custom Quest');
      expect(customCard?.mode).toBe('custom');
    });

    it('should always include cooperative quest card available to all users', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [],
          availableQuests: [],
          storyOptions: [],
          completedQuests: [],
          isLoadingQuests: false,
        })
      );

      const coopCard = result.current.carouselData.find(
        (c) => c.id === 'cooperative'
      );
      expect(coopCard).toBeDefined();
      expect(coopCard?.title).toBe('Cooperative Quest');
      expect(coopCard?.mode).toBe('cooperative');
      expect(coopCard?.isPremium).toBe(false);
    });

    it('includes the holdout card as the fourth mode', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [],
          availableQuests: [],
          storyOptions: [],
          completedQuests: [],
          isLoadingQuests: false,
        })
      );

      const modes = result.current.carouselData.map((c) => c.mode);
      expect(modes).toEqual(['story', 'custom', 'cooperative', 'holdout']);
      const holdout = result.current.carouselData[3];
      expect(holdout.title).toBe('Hold Out');
      expect(holdout.duration).toBe(0);
    });
  });

  describe('Story Progress Calculation', () => {
    it('should calculate progress from server data when available', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [],
          availableQuests: [],
          storyOptions: [],
          completedQuests: [],
          isLoadingQuests: false,
          storylineProgress: { progressPercentage: 50 },
        })
      );

      expect(result.current.storyProgress).toBe(0.5);
    });

    it('should calculate progress from completed quests when no server data', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [],
          availableQuests: [],
          storyOptions: [],
          completedQuests: [
            { id: 'quest-1', mode: 'story', status: 'completed' },
            { id: 'quest-2', mode: 'story', status: 'completed' },
          ],
          isLoadingQuests: false,
          totalStoryQuests: 10,
        })
      );

      expect(result.current.storyProgress).toBe(0.2); // 2/10
    });

    it('should detect storyline completion', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [],
          availableQuests: [],
          storyOptions: [],
          completedQuests: [],
          isLoadingQuests: false,
          storylineProgress: { progressPercentage: 100 },
        })
      );

      expect(result.current.isStorylineComplete).toBe(true);
    });

    it('should not detect completion below threshold', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [],
          availableQuests: [],
          storyOptions: [],
          completedQuests: [],
          isLoadingQuests: false,
          storylineProgress: { progressPercentage: 99 },
        })
      );

      expect(result.current.isStorylineComplete).toBe(false);
    });
  });

  describe('Map Name', () => {
    it('should get map name from server quest', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [
            {
              customId: 'quest-1',
              title: 'Quest',
              durationMinutes: 10,
              reward: { xp: 20 },
            },
          ],
          availableQuests: [],
          storyOptions: [],
          completedQuests: [],
          isLoadingQuests: false,
        })
      );

      expect(result.current.currentMapName).toBe('Vaedros Kingdom');
    });

    it('should get map name from available quest', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [],
          availableQuests: [{ id: 'quest-2', mode: 'story' }],
          storyOptions: [],
          completedQuests: [],
          isLoadingQuests: false,
        })
      );

      expect(result.current.currentMapName).toBe('Vaedros Kingdom');
    });

    it('should use default map name when no quests', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [],
          availableQuests: [],
          storyOptions: [],
          completedQuests: [],
          isLoadingQuests: false,
        })
      );

      expect(result.current.currentMapName).toBe('Vaedros Kingdom');
    });
  });

  describe('Quest Recap', () => {
    it('should use server quest recap', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [
            {
              customId: 'quest-1',
              title: 'Quest',
              recap: 'Server recap text',
              durationMinutes: 10,
              reward: { xp: 20 },
            },
          ],
          availableQuests: [],
          storyOptions: [],
          completedQuests: [],
          isLoadingQuests: false,
        })
      );

      expect(result.current.carouselData[0].recap).toBe('Server recap text');
    });

    it('should use "Begin your journey" when no completed quests', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [
            {
              customId: 'quest-1',
              title: 'Quest',
              durationMinutes: 10,
              reward: { xp: 20 },
            },
          ],
          availableQuests: [],
          storyOptions: [],
          completedQuests: [],
          isLoadingQuests: false,
        })
      );

      expect(result.current.carouselData[0].recap).toBe('Begin your journey');
    });

    it('should use recap from last completed quest', () => {
      const { result } = renderHook(() =>
        useHomeData({
          serverQuests: [
            {
              customId: 'quest-2',
              title: 'Next Quest',
              durationMinutes: 10,
              reward: { xp: 20 },
            },
          ],
          availableQuests: [],
          storyOptions: [],
          completedQuests: [
            {
              id: 'quest-1',
              mode: 'story',
              status: 'completed',
              stopTime: 1000,
              recap: 'Previous quest recap',
            },
          ],
          isLoadingQuests: false,
        })
      );

      expect(result.current.carouselData[0].recap).toBe('Previous quest recap');
    });
  });
});
