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

// Stable capture fn so assertions can see calls — a fresh object per
// usePostHog() call (as the previous inline factory produced) would give
// every render its own throwaway `capture`, making call assertions
// impossible (same fix as verify.test.tsx / social-sign-in-buttons.test.tsx).
const mockPosthogCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: mockPosthogCapture,
  }),
}));

// Mock SocialSignInButtons — this suite only tests the screen's placement
// of, and wiring to, the component; its own behavior (credential exchange,
// cancellation, per-outcome toasts) is covered by
// social-sign-in-buttons.test.tsx. The stub exposes one press target per
// onSuccess/onError scenario the screen needs to handle.
jest.mock('@/components/login/social-sign-in-buttons', () => {
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    SocialSignInButtons: ({
      onSuccess,
      onError,
    }: {
      onSuccess: (target: string, outcome: string, provider: string) => void;
      onError: (kind: 'email-in-use' | 'generic') => void;
    }) => (
      <View testID="social-sign-in-buttons-mock">
        <Pressable
          testID="mock-social-success-google"
          onPress={() => onSuccess('app', 'converted', 'google')}
        />
        <Pressable
          testID="mock-social-success-apple"
          onPress={() => onSuccess('app', 'converted', 'apple')}
        />
        <Pressable
          testID="mock-social-success-existing-account"
          onPress={() => onSuccess('app', 'existing-account-login', 'google')}
        />
        <Pressable
          testID="mock-social-error-email-in-use"
          onPress={() => onError('email-in-use')}
        />
        <Pressable
          testID="mock-social-error-generic"
          onPress={() => onError('generic')}
        />
      </View>
    ),
  };
});

const mockShowMessage = jest.fn();
jest.mock('react-native-flash-message', () => ({
  showMessage: (...args: unknown[]) => mockShowMessage(...args),
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

      const createAccountButton = getByText('Sign up with email');
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

      const createAccountButton = getByText('Sign up with email');
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

      const createAccountButton = getByText('Sign up with email');
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

  describe('Social sign-in', () => {
    it('renders the social sign-in buttons above the Sign up with email button', () => {
      const { getByTestId, getByText, toJSON } = render(
        <QuestCompletedSignupScreen />
      );

      expect(getByTestId('social-sign-in-buttons-mock')).toBeTruthy();
      expect(getByText('Sign up with email')).toBeTruthy();

      // Depth-first walk collecting testIDs and text leaves in render
      // order, so "above" is asserted structurally rather than assumed.
      const order: string[] = [];
      const walk = (node: any): void => {
        if (node === null || typeof node === 'string') {
          if (typeof node === 'string') order.push(node);
          return;
        }
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        if (typeof node.props?.testID === 'string') {
          order.push(node.props.testID);
        }
        if (node.children) walk(node.children);
      };
      walk(toJSON());

      const socialIndex = order.indexOf('social-sign-in-buttons-mock');
      const createAccountIndex = order.indexOf('Sign up with email');

      expect(socialIndex).toBeGreaterThanOrEqual(0);
      expect(createAccountIndex).toBeGreaterThan(socialIndex);
    });

    it('still routes "Sign up with email" to /login', async () => {
      const { getByText } = render(<QuestCompletedSignupScreen />);

      fireEvent.press(getByText('Sign up with email'));

      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith('/login');
      });
    });

    it('fires signup_completed with the provider on a successful google sign-in', async () => {
      const { getByTestId } = render(<QuestCompletedSignupScreen />);

      fireEvent.press(getByTestId('mock-social-success-google'));

      await waitFor(() => {
        expect(mockPosthogCapture).toHaveBeenCalledWith('signup_completed', {
          method: 'google',
        });
      });
    });

    it('fires signup_completed with the provider on a successful apple sign-in', async () => {
      const { getByTestId } = render(<QuestCompletedSignupScreen />);

      fireEvent.press(getByTestId('mock-social-success-apple'));

      await waitFor(() => {
        expect(mockPosthogCapture).toHaveBeenCalledWith('signup_completed', {
          method: 'apple',
        });
      });
    });

    it('does NOT fire signup_completed for a reachable-but-not-new outcome (existing-account-login)', async () => {
      // A reinstalled user whose social account is already linked to a
      // full account lands here (they still have a provisional character
      // + completed quest-1 on this fresh install) but is NOT a new
      // account — `existing-account-login` must not count as a signup.
      const { getByTestId } = render(<QuestCompletedSignupScreen />);

      fireEvent.press(getByTestId('mock-social-success-existing-account'));

      expect(mockPosthogCapture).not.toHaveBeenCalledWith(
        'signup_completed',
        expect.anything()
      );
    });

    it('surfaces a message when social sign-in fails with email-in-use', async () => {
      const { getByTestId } = render(<QuestCompletedSignupScreen />);

      fireEvent.press(getByTestId('mock-social-error-email-in-use'));

      await waitFor(() => {
        expect(mockShowMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'This email is already tied to another account.',
          })
        );
      });
    });

    it('surfaces a generic message when social sign-in fails for any other reason', async () => {
      const { getByTestId } = render(<QuestCompletedSignupScreen />);

      fireEvent.press(getByTestId('mock-social-error-generic'));

      await waitFor(() => {
        expect(mockShowMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Please try again.',
          })
        );
      });
    });
  });
});
