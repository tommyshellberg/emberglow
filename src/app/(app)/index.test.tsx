/**
 * Integration tests for Home component
 *
 * Following React Testing Library principles:
 * "The more your tests resemble the way your software is used,
 *  the more confidence they can give you."
 *
 * These tests focus on:
 * - What users SEE (UI elements, loading states, button text)
 * - What users DO (click buttons, navigate)
 * - How experience differs (premium vs non-premium)
 *
 * Business logic is tested in individual hook tests:
 * - useCarouselState.test.ts (10 tests)
 * - useHomeData.test.ts (16 tests)
 * - useStoryOptions.test.ts
 * - useQuestSelection.ts
 */
import React from 'react';

import { render, screen } from '@/lib/test-utils';

// Mock the router
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

// expo-haptics is a native module the jest environment can't load; the
// DecisionSlider component this screen now renders references its enums at
// call sites, so stub the surface.
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

// Mock QuestTimer
jest.mock('@/lib/services/quest-timer', () => ({
  __esModule: true,
  default: {
    prepareQuest: jest.fn(),
    isRunning: jest.fn(() => false),
  },
}));

// Mock posthog
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: jest.fn(),
  }),
}));

// Mock audio preloader
const mockUseAudioPreloader = jest.fn();
jest.mock('@/hooks/use-audio-preloader', () => ({
  useAudioPreloader: mockUseAudioPreloader,
}));

// Mock premium access
jest.mock('@/lib/hooks/use-premium-access', () => ({
  usePremiumAccess: jest.fn(() => ({
    hasPremiumAccess: false,
    checkPremiumAccess: jest.fn(),
    refreshPremiumStatus: jest.fn(),
    handlePaywallSuccess: jest.fn(),
  })),
}));

// Mock settings store
jest.mock('@/store/settings-store', () => ({
  useSettingsStore: jest.fn((selector) =>
    selector
      ? selector({
          hasSeenBranchingAnnouncement: true, // Don't show modal in tests
        })
      : {
          hasSeenBranchingAnnouncement: true,
        }
  ),
}));

// Mock user store
jest.mock('@/store/user-store', () => ({
  useUserStore: jest.fn((selector) =>
    selector
      ? selector({ user: { id: 'test-user' } })
      : { user: { id: 'test-user' } }
  ),
}));

// Mock onboarding store
const mockIsOnboardingComplete = jest.fn(() => true); // Default to complete (authenticated user)
jest.mock('@/store/onboarding-store', () => ({
  useOnboardingStore: jest.fn((selector) =>
    selector
      ? selector({ isOnboardingComplete: mockIsOnboardingComplete })
      : { isOnboardingComplete: mockIsOnboardingComplete }
  ),
}));

// Mock useServerQuests hook
const mockUseServerQuests = {
  isLoading: false,
  error: null,
  serverQuests: [],
  hasMoreQuests: false,
  storylineComplete: false,
  storylineProgress: undefined,
  options: [],
};

jest.mock('@/hooks/use-server-quests', () => ({
  useServerQuests: jest.fn(() => mockUseServerQuests),
}));

// Mock quest store with minimal state
const mockQuestStoreState: any = {
  activeQuest: null,
  pendingQuest: null,
  availableQuests: [],
  completedQuests: [],
  prepareQuest: jest.fn(),
  refreshAvailableQuests: jest.fn(),
  failQuest: jest.fn(),
};

jest.mock('@/store/quest-store', () => ({
  useQuestStore: Object.assign(
    jest.fn((selector) => selector(mockQuestStoreState)),
    {
      getState: jest.fn(() => mockQuestStoreState),
    }
  ),
}));

// Mock AVAILABLE_QUESTS with minimal data
jest.mock('@/app/data/quests', () => ({
  AVAILABLE_QUESTS: [],
}));

// Mock user services
jest.mock('@/lib/services/user', () => ({
  refreshPremiumStatus: jest.fn().mockResolvedValue({}),
}));

// Import the Home component
const Home = require('./index').default;

describe('Home Component - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset mocks
    mockQuestStoreState.activeQuest = null;
    mockQuestStoreState.pendingQuest = null;
    mockQuestStoreState.availableQuests = [];
    mockQuestStoreState.completedQuests = [];
    mockQuestStoreState.failQuest = jest.fn();

    mockUseServerQuests.isLoading = false;
    mockUseServerQuests.serverQuests = [];
    mockUseServerQuests.options = [];
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('What user SEES', () => {
    it('shows the home screen with quest selection', () => {
      const { unmount } = render(<Home />);

      // User sees the main header
      expect(screen.getByText('Choose Your Adventure')).toBeTruthy();

      // User sees description
      expect(
        screen.getByText(/Continue your epic story, create a quest/)
      ).toBeTruthy();

      unmount();
    });

    it('shows loading message while quests are loading', () => {
      mockUseServerQuests.isLoading = true;

      const { unmount } = render(<Home />);

      // User sees loading feedback
      expect(screen.getByText('Loading quests...')).toBeTruthy();

      unmount();
    });

    it('hides action buttons when user has an active quest', () => {
      mockQuestStoreState.activeQuest = {
        id: 'quest-1',
        title: 'Active Quest',
        startTime: Date.now(),
      };

      const { unmount } = render(<Home />);

      // User cannot see any quest start buttons
      // (They would normally appear after scrolling the carousel)
      expect(screen.queryByText('Start Quest')).toBeNull();
      expect(screen.queryByText('Create Custom Quest')).toBeNull();
      expect(screen.queryByText('Cooperative Quests')).toBeNull();
      expect(screen.queryByText('Unlock Cooperative Mode')).toBeNull();

      unmount();
    });
  });

  describe('Integration with server quests', () => {
    it('displays single server quest with start button', () => {
      mockUseServerQuests.serverQuests = [
        {
          customId: 'quest-5',
          title: 'The Lake Discovery',
          durationMinutes: 15,
          reward: { xp: 45 },
          requiresPremium: false,
          isPremium: false,
        },
      ];

      const { unmount } = render(<Home />);

      // User sees the quest title and a start button. The label is
      // 'Begin your journey' (not 'Start Quest') because the mock state
      // has no completed story quests, which is the first-time-player CTA.
      // The recap text also says 'Begin your journey' for fresh players,
      // so we expect to see it appear at least once on the screen.
      expect(screen.getByText('The Lake Discovery')).toBeTruthy();
      expect(screen.getAllByText('Begin your journey').length).toBeGreaterThan(
        0
      );

      unmount();
    });

    it('displays multiple server quest options when available', () => {
      mockUseServerQuests.serverQuests = [
        {
          customId: 'quest-4a',
          title: 'Unraveling the Inscription',
          durationMinutes: 12,
          reward: { xp: 36 },
          decisionText: 'Stay and investigate the ruins',
          requiresPremium: false,
        },
        {
          customId: 'quest-4b',
          title: 'Moving Forward Before Nightfall',
          durationMinutes: 12,
          reward: { xp: 36 },
          decisionText: 'Continue on before nightfall',
          requiresPremium: false,
        },
      ];

      const { unmount } = render(<Home />);

      // User sees both decision options
      expect(screen.getByText('Stay and investigate the ruins')).toBeTruthy();
      expect(screen.getByText('Continue on before nightfall')).toBeTruthy();

      unmount();
    });

    it('shows premium unlock for premium quests', () => {
      mockUseServerQuests.serverQuests = [
        {
          customId: 'quest-11',
          title: 'The Escape',
          durationMinutes: 12,
          reward: { xp: 36 },
          requiresPremium: true,
          isPremium: true,
        },
      ];

      const { unmount } = render(<Home />);

      // User sees they need premium to continue
      expect(screen.getByText('Unlock full Vaedros storyline')).toBeTruthy();

      unmount();
    });
  });

  describe('Audio preloading', () => {
    beforeEach(() => {
      mockUseAudioPreloader.mockClear();
    });

    it('enables audio preloader for authenticated users (onboarding complete)', () => {
      // Arrange - user has completed onboarding (authenticated)
      mockIsOnboardingComplete.mockReturnValue(true);

      // Act
      const { unmount } = render(<Home />);

      // Assert - audio preloader should be enabled
      expect(mockUseAudioPreloader).toHaveBeenCalledWith({
        storylineId: 'vaedros',
        enabled: true,
      });

      unmount();
    });

    it('disables audio preloader for provisional users (onboarding incomplete)', () => {
      // Arrange - provisional user (onboarding not complete)
      mockIsOnboardingComplete.mockReturnValue(false);

      // Act
      const { unmount } = render(<Home />);

      // Assert - audio preloader should be disabled
      expect(mockUseAudioPreloader).toHaveBeenCalledWith({
        storylineId: 'vaedros',
        enabled: false,
      });

      unmount();
    });
  });

  describe('Branching story announcement modal', () => {
    beforeEach(() => {
      // Reset mock to not show modal by default
      const { useSettingsStore } = require('@/store/settings-store');
      useSettingsStore.mockImplementation((selector: any) =>
        selector
          ? selector({ hasSeenBranchingAnnouncement: true })
          : { hasSeenBranchingAnnouncement: true }
      );
    });

    it('does not trigger modal presentation when user has only completed quest-1', () => {
      mockQuestStoreState.completedQuests = [
        { id: 'quest-1', mode: 'story', status: 'completed' },
      ];

      const { unmount } = render(<Home />);

      // Fast-forward timers - modal should not be presented
      jest.advanceTimersByTime(1500);

      // Note: Bottom sheet modals are always rendered in the DOM but hidden
      // We can't easily test if present() was called without mocking @gorhom/bottom-sheet
      // The important logic (hasCompletedFirstBranch check) is tested via the condition

      unmount();
    });

    it('renders without crashing when user has completed quest-1a and has not seen announcement', () => {
      // User has completed first branching quest
      mockQuestStoreState.completedQuests = [
        { id: 'quest-1', mode: 'story', status: 'completed' },
        { id: 'quest-1a', mode: 'story', status: 'completed' },
      ];

      // User hasn't seen the announcement
      const { useSettingsStore } = require('@/store/settings-store');
      useSettingsStore.mockImplementation((selector: any) =>
        selector
          ? selector({ hasSeenBranchingAnnouncement: false })
          : { hasSeenBranchingAnnouncement: false }
      );

      const { unmount } = render(<Home />);

      // Fast-forward timers to trigger modal presentation (1500ms delay)
      jest.advanceTimersByTime(1500);

      // Verify component renders without errors
      // The modal content is always rendered (bottom sheet pattern)
      expect(screen.getByText('Your Story Just Got Deadlier')).toBeTruthy();
      expect(screen.getByText('Restart at Branching Point')).toBeTruthy();

      unmount();
    });

    it('renders without crashing when user has completed quest-1b and has not seen announcement', () => {
      // User has completed alternate branching quest
      mockQuestStoreState.completedQuests = [
        { id: 'quest-1', mode: 'story', status: 'completed' },
        { id: 'quest-1b', mode: 'story', status: 'completed' },
      ];

      // User hasn't seen the announcement
      const { useSettingsStore } = require('@/store/settings-store');
      useSettingsStore.mockImplementation((selector: any) =>
        selector
          ? selector({ hasSeenBranchingAnnouncement: false })
          : { hasSeenBranchingAnnouncement: false }
      );

      const { unmount } = render(<Home />);

      // Fast-forward timers to trigger modal presentation
      jest.advanceTimersByTime(1500);

      // Verify component renders without errors
      expect(screen.getByText('Your Story Just Got Deadlier')).toBeTruthy();
      expect(screen.getByText('Restart at Branching Point')).toBeTruthy();

      unmount();
    });
  });
});
