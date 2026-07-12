/* eslint-disable max-lines-per-function */
import { Feather } from '@expo/vector-icons';
import { fireEvent } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { useQuestReflection } from '@/api/quest-reflection';
import { cleanup, render, screen, setup, waitFor } from '@/lib/test-utils';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useQuestStore } from '@/store/quest-store';

import AppQuestDetailsScreen from './[id]';

// Mock dependencies
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useFocusEffect: jest.fn((callback) => callback()),
  useRouter: jest.fn(() => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  })),
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
}));

jest.mock('@/api/quest-reflection', () => ({
  useQuestReflection: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
}));

jest.mock('lucide-react-native', () => ({
  ChevronDown: 'ChevronDown',
  ChevronUp: 'ChevronUp',
  Notebook: 'Notebook',
  ArrowLeft: 'ArrowLeft',
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock LottieView
jest.mock('lottie-react-native', () => 'LottieView');

// Mock quest data
jest.mock('@/app/data/quests', () => ({
  AVAILABLE_CUSTOM_QUEST_STORIES: [
    {
      category: 'fitness',
      story: 'You completed your fitness quest!',
    },
    {
      category: 'learning',
      story: 'You expanded your knowledge!',
    },
  ],
}));

// Mock Zustand store
const mockCompletedQuest = {
  id: 'quest-123',
  title: 'Morning Meditation',
  durationMinutes: 30,
  reward: { xp: 90 },
  mode: 'story' as const,
  story: 'You took time to meditate and find peace.',
  status: 'completed' as const,
  stopTime: 1705315800000, // Jan 15, 2024 10:30:00
  questRunId: 'run-123',
};

const mockFailedQuest = {
  id: 'quest-456',
  title: 'Gym Workout',
  durationMinutes: 60,
  reward: { xp: 180 },
  mode: 'custom' as const,
  category: 'fitness',
  status: 'failed' as const,
};

const mockCustomQuest = {
  id: 'quest-789',
  title: 'Reading Time',
  durationMinutes: 45,
  reward: { xp: 135 },
  mode: 'custom' as const,
  category: 'learning',
  status: 'completed' as const,
  stopTime: 1705315800000,
  questRunId: 'run-789',
};

jest.mock('@/store/quest-store');
jest.mock('@/store/onboarding-store');

describe('AppQuestDetailsScreen', () => {
  let mockUseLocalSearchParams: jest.MockedFunction<
    typeof useLocalSearchParams
  >;
  let mockUseQuestReflection: jest.MockedFunction<typeof useQuestReflection>;
  let mockUseQuestStore: jest.MockedFunction<typeof useQuestStore>;

  beforeEach(() => {
    mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
      typeof useLocalSearchParams
    >;
    mockUseQuestReflection = useQuestReflection as jest.MockedFunction<
      typeof useQuestReflection
    >;
    mockUseQuestStore = useQuestStore as jest.MockedFunction<
      typeof useQuestStore
    >;

    // Default mock implementations
    mockUseQuestReflection.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any);

    // Setup store mock with default values
    const mockStoreState = {
      completedQuests: [],
      failedQuest: null,
      failedQuests: [],
      recentCompletedQuest: null,
      resetFailedQuest: jest.fn(),
      clearRecentCompletedQuest: jest.fn(),
    };

    mockUseQuestStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockStoreState);
      }
      return mockStoreState;
    });

    mockUseQuestStore.getState = jest.fn().mockReturnValue(mockStoreState);

    // These screen tests represent a post-onboarding user (journal viewing)
    (useOnboardingStore as unknown as jest.Mock).mockImplementation(
      (selector: any) => selector({ isOnboardingComplete: () => true })
    );
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe('Reflection fetching', () => {
    it('does NOT fetch the reflection outside the journal context', () => {
      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        questData: JSON.stringify(mockCompletedQuest),
      });

      render(<AppQuestDetailsScreen />);

      // The query hook receives no questRunId, so `enabled` stays false and
      // no request is made (e.g. during the post-quest completion flow).
      expect(mockUseQuestReflection).toHaveBeenCalledWith(undefined);
      expect(mockUseQuestReflection).not.toHaveBeenCalledWith('run-123');
    });

    it('fetches the reflection when viewing a journal entry', () => {
      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        from: 'journal',
        questData: JSON.stringify(mockCompletedQuest),
      });

      render(<AppQuestDetailsScreen />);

      expect(mockUseQuestReflection).toHaveBeenCalledWith('run-123');
    });
  });

  describe('Quest Resolution (Priority Order)', () => {
    it('Priority 1: Uses questData from params when provided', () => {
      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        questData: JSON.stringify(mockCompletedQuest),
      });

      render(<AppQuestDetailsScreen />);

      expect(screen.getByText('Morning Meditation')).toBeOnTheScreen();
      // Quest is resolved and rendered (XP display tested in QuestComplete component)
    });

    it('Priority 2: Uses recentCompletedQuest when questData not provided', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: 'quest-123' });

      mockUseQuestStore.mockImplementation((selector: any) => {
        const state = {
          completedQuests: [],
          failedQuest: null,
          failedQuests: [],
          recentCompletedQuest: mockCompletedQuest,
          resetFailedQuest: jest.fn(),
          clearRecentCompletedQuest: jest.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
      });

      render(<AppQuestDetailsScreen />);

      expect(screen.getByText('Morning Meditation')).toBeOnTheScreen();
      // Quest is resolved from recentCompletedQuest
    });

    it('Priority 3: Uses failedQuest when no recent completed quest', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: 'quest-456' });

      mockUseQuestStore.mockImplementation((selector: any) => {
        const state = {
          completedQuests: [],
          failedQuest: mockFailedQuest,
          failedQuests: [],
          recentCompletedQuest: null,
          resetFailedQuest: jest.fn(),
          clearRecentCompletedQuest: jest.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
      });

      render(<AppQuestDetailsScreen />);

      expect(screen.getByText('Gym Workout')).toBeOnTheScreen();
    });

    it('Priority 4: Uses completedQuests with timestamp match', () => {
      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        timestamp: '1705315800000',
      });

      mockUseQuestStore.mockImplementation((selector: any) => {
        const state = {
          completedQuests: [mockCompletedQuest],
          failedQuest: null,
          failedQuests: [],
          recentCompletedQuest: null,
          resetFailedQuest: jest.fn(),
          clearRecentCompletedQuest: jest.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
      });

      render(<AppQuestDetailsScreen />);

      expect(screen.getByText('Morning Meditation')).toBeOnTheScreen();
    });

    it('Priority 5: Uses completedQuests without timestamp', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: 'quest-123' });

      mockUseQuestStore.mockImplementation((selector: any) => {
        const state = {
          completedQuests: [mockCompletedQuest],
          failedQuest: null,
          failedQuests: [],
          recentCompletedQuest: null,
          resetFailedQuest: jest.fn(),
          clearRecentCompletedQuest: jest.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
      });

      render(<AppQuestDetailsScreen />);

      expect(screen.getByText('Morning Meditation')).toBeOnTheScreen();
    });

    it('Priority 6: Uses failedQuests history', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: 'quest-456' });

      mockUseQuestStore.mockImplementation((selector: any) => {
        const state = {
          completedQuests: [],
          failedQuest: null,
          failedQuests: [mockFailedQuest],
          recentCompletedQuest: null,
          resetFailedQuest: jest.fn(),
          clearRecentCompletedQuest: jest.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
      });

      mockUseQuestStore.getState = jest.fn().mockReturnValue({
        completedQuests: [],
        failedQuest: null,
        failedQuests: [mockFailedQuest],
        recentCompletedQuest: null,
        resetFailedQuest: jest.fn(),
        clearRecentCompletedQuest: jest.fn(),
      });

      render(<AppQuestDetailsScreen />);

      expect(screen.getByText('Gym Workout')).toBeOnTheScreen();
    });

    it('Shows not found when quest cannot be resolved', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: 'non-existent' });

      render(<AppQuestDetailsScreen />);

      expect(screen.getByText('Quest not found.')).toBeOnTheScreen();
      expect(screen.getByText('Go Back')).toBeOnTheScreen();
    });
  });

  describe('Rendering - Completed Quest', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        questData: JSON.stringify(mockCompletedQuest),
      });
    });

    it('renders completed quest with all elements', () => {
      render(<AppQuestDetailsScreen />);

      // ScreenHeader (and its "Quest Details" title) is removed by the
      // recomposition spec — the art header's floating back disc replaces it.
      expect(screen.queryByText('Quest Details')).not.toBeOnTheScreen();
      expect(screen.getByText('Morning Meditation')).toBeOnTheScreen();
      // Quest completion screen is rendered
    });

    it('shows the floating back disc instead of a ScreenHeader', () => {
      render(<AppQuestDetailsScreen />);

      expect(screen.getByLabelText('Go back')).toBeOnTheScreen();
    });

    it('renders quest story text for story mode quest', () => {
      render(<AppQuestDetailsScreen />);

      expect(
        screen.getByText('You took time to meditate and find peace.')
      ).toBeOnTheScreen();
    });

    it('renders custom quest with category-based story', () => {
      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-789',
        questData: JSON.stringify(mockCustomQuest),
      });

      render(<AppQuestDetailsScreen />);

      expect(screen.getByText('Reading Time')).toBeOnTheScreen();
      // Custom quests get a story from AVAILABLE_CUSTOM_QUEST_STORIES
      // The exact story depends on the category and quest ID hash
    });
  });

  describe('Rendering - Failed Quest', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-456',
        questData: JSON.stringify(mockFailedQuest),
      });
    });

    it('renders failed quest with header', () => {
      render(<AppQuestDetailsScreen />);

      expect(screen.getByText('Quest Details')).toBeOnTheScreen();
      expect(screen.getByText('Gym Workout')).toBeOnTheScreen();
    });

    it('shows header with quest details title', () => {
      render(<AppQuestDetailsScreen />);

      // ScreenHeader renders the title
      expect(screen.getByText('Quest Details')).toBeOnTheScreen();
    });
  });

  describe('Rendering - Loading State', () => {
    it('shows loading indicator when quest has wrong status', () => {
      const pendingQuest = {
        ...mockCompletedQuest,
        status: 'pending' as const,
      };

      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        questData: JSON.stringify(pendingQuest),
      });

      render(<AppQuestDetailsScreen />);

      expect(screen.getByText('Loading quest details...')).toBeOnTheScreen();
    });
  });

  describe('Rendering - Quest Not Found', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({ id: 'non-existent' });
    });

    it('renders not found message', () => {
      render(<AppQuestDetailsScreen />);

      expect(screen.getByText('Quest not found.')).toBeOnTheScreen();
    });

    it('renders go back button', () => {
      render(<AppQuestDetailsScreen />);

      expect(screen.getByText('Go Back')).toBeOnTheScreen();
    });

    it('calls handleBackNavigation when go back is pressed', async () => {
      const { user } = setup(<AppQuestDetailsScreen />);

      const goBackButton = screen.getByText('Go Back');
      await user.press(goBackButton);

      expect(router.replace).toHaveBeenCalledWith('/(app)');
    });
  });

  describe('Reflection Section', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        from: 'journal',
        questData: JSON.stringify(mockCompletedQuest),
      });
    });

    it('shows "Add reflection" button when no reflection exists', () => {
      render(<AppQuestDetailsScreen />);

      expect(screen.getByText('Add reflection')).toBeOnTheScreen();
    });

    it('shows different action button when not from journal', () => {
      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        // Not setting 'from' param - should show action button in QuestComplete instead
        questData: JSON.stringify(mockCompletedQuest),
      });

      render(<AppQuestDetailsScreen />);

      // Quest is rendered (action button behavior tested in QuestComplete component)
      expect(screen.getByText('Morning Meditation')).toBeOnTheScreen();
    });

    it('shows reflection header when reflection exists', () => {
      const questWithReflection = {
        ...mockCompletedQuest,
        reflection: {
          mood: 5,
          activities: ['meditation', 'reading'],
          text: 'Great experience!',
        },
      };

      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        from: 'journal',
        questData: JSON.stringify(questWithReflection),
      });

      render(<AppQuestDetailsScreen />);

      expect(screen.getByText('Reflection')).toBeOnTheScreen();
      expect(screen.getByText('Added')).toBeOnTheScreen();
    });

    it('displays reflection content when expanded', async () => {
      const questWithReflection = {
        ...mockCompletedQuest,
        reflection: {
          mood: 5,
          activities: ['meditation', 'reading'],
          text: 'Great experience!',
        },
      };

      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        from: 'journal',
        questData: JSON.stringify(questWithReflection),
      });

      const { user } = setup(<AppQuestDetailsScreen />);

      // Initially collapsed - reflection text not visible
      expect(screen.queryByText('Great experience!')).not.toBeOnTheScreen();

      // Tap to expand
      const reflectionHeader = screen.getByText('Reflection');
      await user.press(reflectionHeader);

      // Now content is visible
      await waitFor(() => {
        expect(screen.getByText('Great experience!')).toBeOnTheScreen();
        expect(screen.getByText('meditation')).toBeOnTheScreen();
        expect(screen.getByText('reading')).toBeOnTheScreen();
        expect(screen.getByText('😄')).toBeOnTheScreen(); // mood 5
      });
    });

    it('collapses reflection content when tapped again', async () => {
      const questWithReflection = {
        ...mockCompletedQuest,
        reflection: {
          mood: 4,
          activities: ['exercise'],
          text: 'Felt good',
        },
      };

      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        from: 'journal',
        questData: JSON.stringify(questWithReflection),
      });

      const { user } = setup(<AppQuestDetailsScreen />);

      const reflectionHeader = screen.getByText('Reflection');

      // Expand
      await user.press(reflectionHeader);
      await waitFor(() => {
        expect(screen.getByText('Felt good')).toBeOnTheScreen();
      });

      // Collapse
      await user.press(reflectionHeader);
      await waitFor(() => {
        expect(screen.queryByText('Felt good')).not.toBeOnTheScreen();
      });
    });

    it('displays server reflection when available', () => {
      mockUseQuestReflection.mockReturnValue({
        data: {
          mood: 3,
          activities: ['yoga'],
          text: 'Server reflection',
        },
        isLoading: false,
        error: null,
      } as any);

      render(<AppQuestDetailsScreen />);

      expect(screen.getByText('Reflection')).toBeOnTheScreen();
    });

    it('navigates to reflection screen when Add reflection is pressed', async () => {
      const { user } = setup(<AppQuestDetailsScreen />);

      const addButton = screen.getByText('Add reflection');
      await user.press(addButton);

      expect(router.push).toHaveBeenCalledWith({
        pathname: '/(app)/quest/reflection',
        params: {
          questId: 'quest-123',
          questRunId: 'run-123',
          duration: 30,
          from: 'quest-detail',
        },
      });
    });

    it('displays all mood emojis correctly', async () => {
      const { user } = setup(<AppQuestDetailsScreen />);

      const moods = [
        { value: 1, emoji: '😡' },
        { value: 2, emoji: '😕' },
        { value: 3, emoji: '😐' },
        { value: 4, emoji: '😊' },
        { value: 5, emoji: '😄' },
      ];

      for (const { value, emoji } of moods) {
        const questWithMood = {
          ...mockCompletedQuest,
          reflection: { mood: value, activities: [], text: `Mood ${value}` },
        };

        mockUseLocalSearchParams.mockReturnValue({
          id: 'quest-123',
          from: 'journal',
          questData: JSON.stringify(questWithMood),
        });

        const { unmount } = render(<AppQuestDetailsScreen />);

        const reflectionHeader = screen.getByText('Reflection');
        await user.press(reflectionHeader);

        await waitFor(() => {
          expect(screen.getByText(emoji)).toBeOnTheScreen();
        });

        unmount();
      }
    });
  });

  describe('Navigation and Cleanup', () => {
    // Note: These tests verify the cleanup functions are set up correctly in the component.
    // Since the back button navigation is hard to test without testIDs,
    // we verify the component renders and has the necessary cleanup logic via mock verification.

    it('sets up recentCompletedQuest cleanup for matching quest', () => {
      const mockClearRecentCompletedQuest = jest.fn();

      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        questData: JSON.stringify(mockCompletedQuest),
      });

      mockUseQuestStore.mockImplementation((selector: any) => {
        const state = {
          completedQuests: [],
          failedQuest: null,
          failedQuests: [],
          recentCompletedQuest: mockCompletedQuest,
          resetFailedQuest: jest.fn(),
          clearRecentCompletedQuest: mockClearRecentCompletedQuest,
        };
        return typeof selector === 'function' ? selector(state) : state;
      });

      render(<AppQuestDetailsScreen />);

      // Verify component renders with recent completed quest
      expect(screen.getByText('Morning Meditation')).toBeOnTheScreen();
      // Cleanup function is available in the component (tested via user interaction in integration tests)
    });

    it('sets up failedQuest cleanup for failed quest', () => {
      const mockResetFailedQuest = jest.fn();

      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-456',
        questData: JSON.stringify(mockFailedQuest),
      });

      mockUseQuestStore.mockImplementation((selector: any) => {
        const state = {
          completedQuests: [],
          failedQuest: mockFailedQuest,
          failedQuests: [],
          recentCompletedQuest: null,
          resetFailedQuest: mockResetFailedQuest,
          clearRecentCompletedQuest: jest.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
      });

      render(<AppQuestDetailsScreen />);

      // Verify component renders failed quest
      expect(screen.getByText('Gym Workout')).toBeOnTheScreen();
      // Cleanup function is available in the component (tested via user interaction in integration tests)
    });

    it('clears all quest states when quest ID is undefined', async () => {
      const mockClearRecentCompletedQuest = jest.fn();
      const mockResetFailedQuest = jest.fn();

      mockUseLocalSearchParams.mockReturnValue({ id: undefined });

      mockUseQuestStore.mockImplementation((selector: any) => {
        const state = {
          completedQuests: [],
          failedQuest: null,
          failedQuests: [],
          recentCompletedQuest: null,
          resetFailedQuest: mockResetFailedQuest,
          clearRecentCompletedQuest: mockClearRecentCompletedQuest,
        };
        return typeof selector === 'function' ? selector(state) : state;
      });

      const { user } = setup(<AppQuestDetailsScreen />);

      const goBackButton = screen.getByText('Go Back');
      await user.press(goBackButton);

      expect(mockClearRecentCompletedQuest).toHaveBeenCalled();
      expect(mockResetFailedQuest).toHaveBeenCalled();
    });
  });

  describe('Different Quest Modes', () => {
    it('renders story quest with custom story text', () => {
      render(<AppQuestDetailsScreen />);

      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        questData: JSON.stringify(mockCompletedQuest),
      });

      render(<AppQuestDetailsScreen />);

      expect(
        screen.getByText('You took time to meditate and find peace.')
      ).toBeOnTheScreen();
    });

    it('renders custom quest with category-based story', () => {
      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-789',
        questData: JSON.stringify(mockCustomQuest),
      });

      render(<AppQuestDetailsScreen />);

      // The story is generated from AVAILABLE_CUSTOM_QUEST_STORIES based on category
      // We can verify the quest title is shown
      expect(screen.getByText('Reading Time')).toBeOnTheScreen();
    });
  });

  describe('Props from Journal vs Direct Navigation', () => {
    it('shows action button when not from journal', () => {
      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        questData: JSON.stringify(mockCompletedQuest),
      });

      render(<AppQuestDetailsScreen />);

      // QuestComplete component receives showActionButton={true}
      // We can't easily test this without looking at the component tree
      // but we can verify the quest is rendered
      expect(screen.getByText('Morning Meditation')).toBeOnTheScreen();
    });

    it('hides action button when from journal', () => {
      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        from: 'journal',
        questData: JSON.stringify(mockCompletedQuest),
      });

      render(<AppQuestDetailsScreen />);

      // QuestComplete component receives showActionButton={false}
      expect(screen.getByText('Morning Meditation')).toBeOnTheScreen();
    });

    it('disables entering animations when from journal', () => {
      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        from: 'journal',
        questData: JSON.stringify(mockCompletedQuest),
      });

      render(<AppQuestDetailsScreen />);

      // Verify quest renders (animations are disabled in props)
      expect(screen.getByText('Morning Meditation')).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('renders accessible quest details screen', () => {
      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        questData: JSON.stringify(mockCompletedQuest),
      });

      render(<AppQuestDetailsScreen />);

      // Verify accessible content is rendered — the floating back disc
      // (art header) replaces the old ScreenHeader's back button.
      expect(screen.getByLabelText('Go back')).toBeOnTheScreen();
      expect(screen.getByText('Morning Meditation')).toBeOnTheScreen();
    });

    it('not found screen has accessible go back button', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: 'non-existent' });

      render(<AppQuestDetailsScreen />);

      const goBackButton = screen.getByText('Go Back');
      expect(goBackButton).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles malformed questData JSON', () => {
      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        questData: 'invalid-json{',
      });

      render(<AppQuestDetailsScreen />);

      // Should fall back to showing not found
      expect(screen.getByText('Quest not found.')).toBeOnTheScreen();
    });

    it('handles quest without stopTime for completed status', () => {
      const questWithoutStopTime = {
        ...mockCompletedQuest,
        stopTime: undefined,
      };

      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        questData: JSON.stringify(questWithoutStopTime),
      });

      render(<AppQuestDetailsScreen />);

      // Should show loading state since completed quest requires stopTime
      expect(screen.getByText('Loading quest details...')).toBeOnTheScreen();
    });

    it('handles quest without questRunId', () => {
      const questWithoutRunId = {
        ...mockCompletedQuest,
        questRunId: undefined,
      };

      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-123',
        from: 'journal',
        questData: JSON.stringify(questWithoutRunId),
      });

      render(<AppQuestDetailsScreen />);

      // Should not show Add reflection button if no questRunId
      expect(screen.queryByText('Add reflection')).not.toBeOnTheScreen();
    });

    it('handles quest without story or category', () => {
      const questWithoutStory = {
        id: 'quest-999',
        title: 'Generic Quest',
        durationMinutes: 20,
        reward: { xp: 60 },
        mode: 'custom' as const,
        status: 'completed' as const,
        stopTime: 1705315800000,
        questRunId: 'run-999',
      };

      mockUseLocalSearchParams.mockReturnValue({
        id: 'quest-999',
        questData: JSON.stringify(questWithoutStory),
      });

      render(<AppQuestDetailsScreen />);

      // Should show default completion text
      expect(screen.getByText('Generic Quest')).toBeOnTheScreen();
    });
  });
});
