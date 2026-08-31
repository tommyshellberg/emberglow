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

import { fireEvent, render, screen } from '@/lib/test-utils';
import type { AnnouncementKey } from '@/store/announcement-store';

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

// Mock announcement store. getAnnouncementToShow drives whether an announcement
// surfaces; default null so no sheet is presented in unrelated tests. The
// hasSeen* setters are read by the real modal components rendered inside Home.
const mockGetAnnouncementToShow = jest.fn((): AnnouncementKey | null => null);
const mockAnnouncementState = {
  hasSeenBranchingAnnouncement: false,
  hasSeenSkillTreeAnnouncement: false,
  hasSeenGuildsAnnouncement: false,
  hasSeenNarratorVoiceAnnouncement: false,
  lastAnnouncementShownAt: null,
  setHasSeenBranchingAnnouncement: jest.fn(),
  setHasSeenSkillTreeAnnouncement: jest.fn(),
  setHasSeenGuildsAnnouncement: jest.fn(),
  setHasSeenNarratorVoiceAnnouncement: jest.fn(),
  markAnnouncementShown: jest.fn(),
  getAnnouncementToShow: mockGetAnnouncementToShow,
};
jest.mock('@/store/announcement-store', () => ({
  useAnnouncementStore: jest.fn((selector) =>
    selector ? selector(mockAnnouncementState) : mockAnnouncementState
  ),
  getAnnouncementToShow: (...args: unknown[]) =>
    mockGetAnnouncementToShow(...(args as [])),
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

jest.mock('@/lib/invite/check-invite-match', () => ({
  checkInviteMatch: jest.fn().mockResolvedValue(undefined),
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

  describe('Invite attribution', () => {
    it('runs the invite consumer on mount so a stashed code is never stranded', () => {
      const { checkInviteMatch } = require('@/lib/invite/check-invite-match');

      const { unmount } = render(<Home />);

      expect(checkInviteMatch).toHaveBeenCalled();
      unmount();
    });
  });

  describe('What user SEES', () => {
    it('shows the home screen with quest selection', () => {
      const { unmount } = render(<Home />);

      // User sees the main header
      expect(screen.getByText('Choose an Adventure')).toBeTruthy();

      unmount();
    });

    it('shows loading message while quests are loading', () => {
      mockUseServerQuests.isLoading = true;

      const { unmount } = render(<Home />);

      // User sees loading feedback
      expect(screen.getByText('Loading quests...')).toBeTruthy();

      unmount();
    });

    it('keeps the footer mounted but inert while a quest is pending', () => {
      // Fabric crash mitigation (device-captured 2026-07-16, upstream
      // reanimated#7594): committing the DecisionSlider arms pendingQuest
      // while the slider's settle worklet is still animating the footer's
      // views. Unmounting them at that instant lets the worklet deliver
      // props to dead views — host-fatal on the New Architecture ("Unable
      // to find viewState for tag"). The footer must stay MOUNTED (live
      // views for the worklet) but INERT (invisible, untouchable) until
      // the pending-quest screen covers it.
      mockQuestStoreState.pendingQuest = {
        id: 'quest-1',
        title: 'Pending Quest',
      };

      const { unmount } = render(<Home />);

      const footer = screen.getByTestId('home-footer');
      expect(footer.props.style).toEqual(
        expect.objectContaining({ opacity: 0, pointerEvents: 'none' })
      );

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

  describe('Feature announcements', () => {
    // The which-announcement decision now lives in the announcement store's
    // getAnnouncementToShow selector (unit-tested in announcement-store.test.ts).
    // Here we assert Home wires that decision to the once-per-day throttle.
    it('does not present or stamp the throttle when no announcement is due', () => {
      mockGetAnnouncementToShow.mockReturnValue(null);

      const { unmount } = render(<Home />);
      jest.advanceTimersByTime(1500);

      expect(
        mockAnnouncementState.markAnnouncementShown
      ).not.toHaveBeenCalled();

      unmount();
    });

    it('presents the due announcement and stamps the throttle exactly once', () => {
      mockGetAnnouncementToShow.mockReturnValue('branching');
      mockQuestStoreState.completedQuests = [
        { id: 'quest-1', mode: 'story', status: 'completed' },
        { id: 'quest-1a', mode: 'story', status: 'completed' },
      ];

      const { unmount } = render(<Home />);
      jest.advanceTimersByTime(1500);

      // The throttle fires when the sheet is presented, capping the day at one.
      expect(mockAnnouncementState.markAnnouncementShown).toHaveBeenCalledTimes(
        1
      );
      // The branching sheet content is mounted (bottom-sheet pattern).
      expect(screen.getByText('Your Story Just Got Deadlier')).toBeTruthy();
      expect(screen.getByText('Restart at Branching Point')).toBeTruthy();

      unmount();
    });

    it('presents the narrator voice announcement and stamps the throttle when due', () => {
      mockGetAnnouncementToShow.mockReturnValue('narratorVoice');

      const { unmount } = render(<Home />);
      jest.advanceTimersByTime(1500);

      expect(mockAnnouncementState.markAnnouncementShown).toHaveBeenCalledTimes(
        1
      );
      // The narrator sheet content is mounted (bottom-sheet pattern).
      expect(screen.getByText('Choose Who Tells Your Story')).toBeTruthy();
      expect(screen.getByText('Choose My Narrator')).toBeTruthy();

      unmount();
    });
  });

  describe('Holdout mode', () => {
    it('navigates to /holdout-quest when the user starts a hold-out quest', () => {
      mockGetAnnouncementToShow.mockReturnValue(null);

      const { unmount } = render(<Home />);

      // Advance the deck from story (0) to holdout (3) by pressing each
      // back card in turn, same as swiping — pressing any non-front card
      // calls onAdvance(1). Each back card exposes a "Show <label> card"
      // button (see quest-deck.tsx), same idiom as quest-deck.test.tsx.
      fireEvent.press(screen.getByRole('button', { name: 'Show Custom card' }));
      fireEvent.press(screen.getByRole('button', { name: 'Show Co-op card' }));
      fireEvent.press(
        screen.getByRole('button', { name: 'Show Hold Out card' })
      );

      fireEvent.press(screen.getByText('Start Holding Out'));

      expect(mockPush).toHaveBeenCalledWith('/holdout-quest');

      unmount();
    });
  });
});
