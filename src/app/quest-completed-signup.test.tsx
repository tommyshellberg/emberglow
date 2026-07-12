import React from 'react';

import { fireEvent, render, waitFor } from '@/lib/test-utils';
import { useCharacterStore } from '@/store/character-store';
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

// Character store — the hero card reads name/level/type from here (see
// `characters.ts` lookup by `character.type` in the screen). A fixture
// character exercises the real-data path; individual tests override the
// mock to exercise the null-character fallback path.
const mockCharacterFixture = {
  type: 'wizard',
  name: 'Rowan',
  level: 3,
  currentXP: 250,
};

jest.mock('@/store/character-store', () => ({
  useCharacterStore: jest.fn(),
}));

const mockUseOnboardingStore = useOnboardingStore as jest.MockedFunction<
  typeof useOnboardingStore
>;
const mockUseCharacterStore = useCharacterStore as jest.MockedFunction<
  typeof useCharacterStore
>;

describe('QuestCompletedSignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseOnboardingStore.mockImplementation((selector) =>
      selector(mockOnboardingStore as any)
    );
    mockUseCharacterStore.mockImplementation((selector) =>
      (selector as any)({ character: mockCharacterFixture })
    );
  });

  describe('Create Account Flow', () => {
    it('should navigate to login when Create Account button is pressed', async () => {
      const { getByText } = render(<QuestCompletedSignupScreen />);

      const createAccountButton = getByText('Create account');
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

      const createAccountButton = getByText('Create account');
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

      const createAccountButton = getByText('Create account');
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

      expect(getByText('Claim your legend')).toBeTruthy();
    });

    it('should display the three unlock rows', () => {
      const { getByText } = render(<QuestCompletedSignupScreen />);

      expect(
        getByText('The story continues — chapter two awaits')
      ).toBeTruthy();
      expect(
        getByText('Custom quests for the life you actually live')
      ).toBeTruthy();
      expect(getByText('Co-op quests with friends')).toBeTruthy();
    });

    it('should display the chapter eyebrow label', () => {
      const { getByText } = render(<QuestCompletedSignupScreen />);

      // EyebrowLabel renders `textTransform: 'uppercase'` in its own
      // styles — RNTL matches the underlying text node, not the rendered
      // (visually-transformed) casing, so this queries the source string.
      expect(getByText('Quest one · complete')).toBeTruthy();
    });
  });

  describe('Hero summary card', () => {
    it('displays the real character name, level, type, and quest-1 XP reward', () => {
      const { getByText } = render(<QuestCompletedSignupScreen />);

      expect(getByText('Rowan')).toBeTruthy();
      // Style-driven uppercase, same RNTL caveat as the eyebrow above.
      expect(getByText('Level 3 · Wizard')).toBeTruthy();
      // quest-1's reward.xp in `src/app/data/quests.ts` is a fixed 100.
      expect(getByText('+100 XP')).toBeTruthy();
    });

    it('falls back to a generic hero name and type when no character exists yet', () => {
      mockUseCharacterStore.mockImplementation((selector) =>
        (selector as any)({ character: null })
      );

      const { getAllByText, getByText } = render(
        <QuestCompletedSignupScreen />
      );

      expect(getAllByText(/Your hero/).length).toBeGreaterThan(0);
      expect(getByText('Level 1 · Adventurer')).toBeTruthy();
    });
  });

  describe('Footnote', () => {
    it('names the hero in the device-only disclaimer', () => {
      const { getByText } = render(<QuestCompletedSignupScreen />);

      expect(
        getByText(
          'Rowan lives only on this device for now. A free account is how you keep them.'
        )
      ).toBeTruthy();
    });
  });
});
