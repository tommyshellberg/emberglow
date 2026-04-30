import React from 'react';

import { fireEvent, render, waitFor } from '@/lib/test-utils';
import { useOnboardingStore } from '@/store/onboarding-store';
import { OnboardingStep } from '@/store/onboarding-store';

import QuestCompletedSignupScreen from './quest-completed-signup';

// Create shared mock functions at module level
const mockRouterReplace = jest.fn();
const mockSetOnboardingStep = jest.fn();

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    replace: (...args: any[]) => mockRouterReplace(...args),
  },
}));

jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: jest.fn(),
  }),
}));

// Mock stores
const mockOnboardingStore = {
  setCurrentStep: mockSetOnboardingStep,
};

jest.mock('@/store/onboarding-store', () => ({
  useOnboardingStore: jest.fn(),
  OnboardingStep: {
    VIEWING_SIGNUP_PROMPT: 'VIEWING_SIGNUP_PROMPT',
    COMPLETED: 'COMPLETED',
  },
}));

const mockUseOnboardingStore = useOnboardingStore as jest.MockedFunction<
  typeof useOnboardingStore
>;

describe('QuestCompletedSignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseOnboardingStore.mockImplementation((selector) =>
      selector(mockOnboardingStore as any)
    );
  });

  describe('Create Account Flow', () => {
    it('should navigate to login when Create Account button is pressed', async () => {
      const { getByText } = render(<QuestCompletedSignupScreen />);

      const createAccountButton = getByText('Create Account');
      fireEvent.press(createAccountButton);

      // Wait for async navigation
      await waitFor(
        () => {
          expect(mockRouterReplace).toHaveBeenCalledWith('/login');
        },
        { timeout: 200 }
      );
    });

    it('should NOT set onboarding to COMPLETED when navigating to login', async () => {
      const { getByText } = render(<QuestCompletedSignupScreen />);

      const createAccountButton = getByText('Create Account');
      fireEvent.press(createAccountButton);

      // Wait for any async operations
      await waitFor(
        () => {
          // This test will FAIL because the current implementation sets onboarding to COMPLETED
          expect(mockSetOnboardingStep).not.toHaveBeenCalledWith(
            OnboardingStep.COMPLETED
          );
        },
        { timeout: 200 }
      );
    });

    it('should use router.replace instead of router.push', async () => {
      const { getByText } = render(<QuestCompletedSignupScreen />);

      const createAccountButton = getByText('Create Account');
      fireEvent.press(createAccountButton);

      await waitFor(
        () => {
          expect(mockRouterReplace).toHaveBeenCalled();
        },
        { timeout: 200 }
      );
    });
  });

  describe('UI Elements', () => {
    it('should display the signup prompt title', () => {
      const { getByText } = render(<QuestCompletedSignupScreen />);

      expect(getByText('Claim Your Legend')).toBeTruthy();
    });

    it('should display the completion message', () => {
      const { getByText } = render(<QuestCompletedSignupScreen />);

      expect(getByText("You've completed your first quest!")).toBeTruthy();
    });

    it('should display account benefits', () => {
      const { getByText } = render(<QuestCompletedSignupScreen />);

      expect(getByText('Sign up to unlock:')).toBeTruthy();
      expect(
        getByText('Continue your story across 29 more quests')
      ).toBeTruthy();
      expect(
        getByText('Forge custom quests from your real-world goals')
      ).toBeTruthy();
      expect(
        getByText("Track your hero's journey in the journal")
      ).toBeTruthy();
      expect(
        getByText('Explore the map of Vaedros and uncover hidden regions')
      ).toBeTruthy();
      expect(
        getByText('Form a guild and run cooperative quests with friends')
      ).toBeTruthy();
    });

    it('should display the chapter eyebrow label', () => {
      const { getByText } = render(<QuestCompletedSignupScreen />);

      expect(getByText('QUEST ONE · COMPLETE')).toBeTruthy();
    });
  });
});
