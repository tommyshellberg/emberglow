import React from 'react';

import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';
import { useOnboardingStore } from '@/store/onboarding-store';
import { OnboardingStep } from '@/store/onboarding-store';
import { useQuestStore } from '@/store/quest-store';
import { useSettingsStore } from '@/store/settings-store';

import FirstQuestResultScreen from './first-quest-result';

// The reminder opt-in screen (phase 2 of this celebration) renders the real
// ReminderOptIn, which renders the native DateTimePicker. Its iOS module
// wraps onChange into a single-arg handler that fireEvent's two-arg
// convention can't satisfy, so it's stubbed to a plain host component —
// same pattern as reminder-opt-in.test.tsx.
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Create shared mock functions at module level
const mockRouterReplace = jest.fn();
const mockRouterPush = jest.fn();
const mockUseLocalSearchParams = jest.fn(() => ({ outcome: 'completed' }));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    replace: (...args: any[]) => mockRouterReplace(...args),
    push: (...args: any[]) => mockRouterPush(...args),
  },
  useLocalSearchParams: (...args: any[]) => mockUseLocalSearchParams(...args),
}));

jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: jest.fn(),
  }),
}));

// Mock components
jest.mock('@/components/QuestComplete', () => ({
  QuestComplete: ({ onContinue }: { onContinue: () => void }) => {
    const MockView = require('react-native').View;
    const MockButton = require('react-native').Pressable;
    const MockText = require('react-native').Text;
    return (
      <MockView testID="quest-complete">
        <MockButton testID="continue-button" onPress={onContinue}>
          <MockText>Continue Your Journey</MockText>
        </MockButton>
      </MockView>
    );
  },
}));

jest.mock('@/components/failed-quest', () => ({
  FailedQuest: ({ onRetry }: { onRetry: () => void }) => {
    const MockView = require('react-native').View;
    const MockButton = require('react-native').Pressable;
    const MockText = require('react-native').Text;
    return (
      <MockView testID="failed-quest">
        <MockButton testID="retry-button" onPress={onRetry}>
          <MockText>Try Again</MockText>
        </MockButton>
      </MockView>
    );
  },
}));

jest.mock('@/app/data/quests', () => ({
  AVAILABLE_QUESTS: [
    {
      id: 'quest-1',
      mode: 'story',
      title: 'First Quest',
      story: 'You completed your first trial!',
      duration: 120,
    },
  ],
}));

// Mock stores
// onboarding-store is kept REAL (not jest.mock'd): its setCurrentStep is
// forward-only, so a bare jest.fn() double would silently accept backward
// moves the real store blocks, hiding bugs in the phase-2 gating below.
// settings-store is real for the same reason (hasBeenPromptedForReminder is
// the gate the new phase logic reads and writes).
const mockQuestStore = {
  resetFailedQuest: jest.fn(),
  clearRecentCompletedQuest: jest.fn(),
  recentCompletedQuest: null,
};

const mockAuthState = { status: 'signOut' as 'signOut' | 'signIn' };
jest.mock('@/lib/auth', () => ({
  useAuth: (selector: any) => selector(mockAuthState),
}));

jest.mock('@/store/quest-store', () => ({
  useQuestStore: jest.fn(),
}));

const mockUseQuestStore = useQuestStore as jest.MockedFunction<
  typeof useQuestStore
>;

describe('FirstQuestResultScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to the onboarding-era case: an unauthenticated first-quest run.
    mockAuthState.status = 'signOut';

    mockUseQuestStore.mockImplementation((selector) =>
      selector(mockQuestStore as any)
    );

    useOnboardingStore.setState({
      currentStep: OnboardingStep.STARTING_FIRST_QUEST,
    });
    // Default to "already prompted" so pre-existing tests (written before
    // phase 2 existed) keep exercising today's immediate-release behavior on
    // Continue. The new "daily reminder phase 2" describe block below
    // overrides this back to false in its own beforeEach.
    useSettingsStore.setState({
      hasBeenPromptedForReminder: true,
      reminderPromptedAt: null,
      dailyReminder: { enabled: false, time: null },
    });
  });

  describe('Quest Completion Flow', () => {
    // A character-less social account is sent back through onboarding while
    // ALREADY signed in, so it reaches this screen authenticated. The signup
    // prompt asks such a user to create the account they are currently using.
    it('completes onboarding instead of prompting signup when already signed in', () => {
      mockAuthState.status = 'signIn';

      render(<FirstQuestResultScreen />);

      expect(useOnboardingStore.getState().currentStep).not.toBe(
        OnboardingStep.VIEWING_SIGNUP_PROMPT
      );
      expect(useOnboardingStore.getState().currentStep).toBe(
        OnboardingStep.COMPLETED
      );
    });

    it('should call clearRecentCompletedQuest when Continue button is pressed', () => {
      const { getByTestId } = render(<FirstQuestResultScreen />);

      const continueButton = getByTestId('continue-button');
      fireEvent.press(continueButton);

      expect(mockQuestStore.clearRecentCompletedQuest).toHaveBeenCalled();
    });

    it('should set onboarding step to VIEWING_SIGNUP_PROMPT when Continue is pressed', () => {
      const { getByTestId } = render(<FirstQuestResultScreen />);

      const continueButton = getByTestId('continue-button');
      fireEvent.press(continueButton);

      expect(useOnboardingStore.getState().currentStep).toBe(
        OnboardingStep.VIEWING_SIGNUP_PROMPT
      );
    });
  });

  describe('Navigation Behavior', () => {
    it('should not call router directly - NavigationGate handles navigation', () => {
      const { getByTestId } = render(<FirstQuestResultScreen />);

      const continueButton = getByTestId('continue-button');
      fireEvent.press(continueButton);

      // Router should NOT be called directly - NavigationGate will handle navigation
      // based on the onboarding step change
      expect(mockRouterReplace).not.toHaveBeenCalled();
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should clear quest state and update onboarding step to trigger navigation', () => {
      const { getByTestId } = render(<FirstQuestResultScreen />);

      const continueButton = getByTestId('continue-button');
      fireEvent.press(continueButton);

      // Verify both state updates are called (NavigationGate will handle routing)
      expect(mockQuestStore.clearRecentCompletedQuest).toHaveBeenCalled();
      expect(useOnboardingStore.getState().currentStep).toBe(
        OnboardingStep.VIEWING_SIGNUP_PROMPT
      );
    });
  });

  describe('Failed Quest Flow', () => {
    beforeEach(() => {
      // Mock the useLocalSearchParams to return failed outcome
      mockUseLocalSearchParams.mockReturnValue({ outcome: 'failed' });
    });

    it('should call resetFailedQuest when Retry button is pressed', () => {
      const { getByTestId } = render(<FirstQuestResultScreen />);

      const retryButton = getByTestId('retry-button');
      fireEvent.press(retryButton);

      expect(mockQuestStore.resetFailedQuest).toHaveBeenCalled();
    });

    it('should navigate to first-quest screen on retry', () => {
      const { getByTestId } = render(<FirstQuestResultScreen />);

      const retryButton = getByTestId('retry-button');
      fireEvent.press(retryButton);

      expect(mockRouterReplace).toHaveBeenCalledWith('/onboarding/first-quest');
    });
  });

  describe('daily reminder phase 2', () => {
    const renderCompletedOutcome = () => {
      mockUseLocalSearchParams.mockReturnValue({ outcome: 'completed' });
      return render(<FirstQuestResultScreen />);
    };
    const renderFailedOutcome = () => {
      mockUseLocalSearchParams.mockReturnValue({ outcome: 'failed' });
      return render(<FirstQuestResultScreen />);
    };

    beforeEach(() => {
      useSettingsStore.setState({
        hasBeenPromptedForReminder: false,
        reminderPromptedAt: null,
        dailyReminder: { enabled: false, time: null },
      });
      useOnboardingStore.setState({
        currentStep: OnboardingStep.STARTING_FIRST_QUEST,
      });
    });

    it('shows the reminder step after Continue and stamps the prompt flags', () => {
      renderCompletedOutcome();
      fireEvent.press(screen.getByText('Continue Your Journey'));

      expect(screen.getByText('When will you quest each day?')).toBeTruthy();
      expect(useSettingsStore.getState().hasBeenPromptedForReminder).toBe(true);
      expect(useSettingsStore.getState().reminderPromptedAt).not.toBeNull();
      // Screen NOT released yet: releaseScreen has not run.
      expect(mockQuestStore.clearRecentCompletedQuest).not.toHaveBeenCalled();
    });

    it('releases the screen after skipping the reminder', () => {
      renderCompletedOutcome();
      fireEvent.press(screen.getByText('Continue Your Journey'));

      // The mount effect already advances currentStep to
      // VIEWING_SIGNUP_PROMPT (outcome is 'completed' from the first
      // render), so asserting that value after Skip would pass even if
      // releaseScreen never touched the step. Force the step back down via
      // setState (bypassing the store's forward-only setCurrentStep guard)
      // so the assertion below can only pass if releaseScreen's own
      // setOnboardingStep call actually fires.
      useOnboardingStore.setState({
        currentStep: OnboardingStep.STARTING_FIRST_QUEST,
      });

      fireEvent.press(screen.getByText('Skip for now'));

      expect(mockQuestStore.clearRecentCompletedQuest).toHaveBeenCalled();
      expect(useOnboardingStore.getState().currentStep).toBe(
        OnboardingStep.VIEWING_SIGNUP_PROMPT
      );
    });

    it('releases immediately when already prompted', () => {
      useSettingsStore.setState({ hasBeenPromptedForReminder: true });
      renderCompletedOutcome();
      fireEvent.press(screen.getByText('Continue Your Journey'));

      expect(screen.queryByText('When will you quest each day?')).toBeNull();
      expect(mockQuestStore.clearRecentCompletedQuest).toHaveBeenCalled();
    });

    it('never shows the reminder step for a failed outcome', () => {
      renderFailedOutcome();
      expect(screen.queryByText('When will you quest each day?')).toBeNull();
    });
  });
});
