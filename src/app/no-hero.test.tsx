import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { render } from '@/lib/test-utils';
import { OnboardingStep, useOnboardingStore } from '@/store/onboarding-store';

import NoHeroScreen from './no-hero';

// The screen imports the top-level `router` singleton (not the useRouter()
// hook), which requires expo-router's global navigation state to be ready —
// unavailable under RNTL. Mocked the same way as quest-completed-signup.test.
const mockRouterReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    replace: (...args: any[]) => mockRouterReplace(...args),
  },
}));

it('restarts onboarding at character selection, skipping the welcome tap', () => {
  useOnboardingStore.setState({ currentStep: OnboardingStep.COMPLETED });

  render(<NoHeroScreen />);
  fireEvent.press(screen.getByTestId('no-hero-choose-button'));

  // The resulting STEP, not that a setter was called — and it must be
  // SELECTING_CHARACTER, not NOT_STARTED: this screen already collected the
  // "begin" intent, so landing on welcome would make the user tap it twice.
  // The move is only legal as reset-then-forward: COMPLETED →
  // SELECTING_CHARACTER directly is a BACKWARD move that setCurrentStep
  // silently discards.
  expect(useOnboardingStore.getState().currentStep).toBe(
    OnboardingStep.SELECTING_CHARACTER
  );
  expect(mockRouterReplace).toHaveBeenCalledWith(
    '/onboarding/choose-character'
  );
});
