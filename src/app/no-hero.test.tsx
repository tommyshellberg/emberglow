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

it('resets onboarding and opens the welcome screen', () => {
  useOnboardingStore.setState({ currentStep: OnboardingStep.COMPLETED });

  render(<NoHeroScreen />);
  fireEvent.press(screen.getByTestId('no-hero-choose-button'));

  // The resulting STEP, not that a setter was called — COMPLETED to
  // NOT_STARTED is a BACKWARD move, which setCurrentStep silently discards.
  expect(useOnboardingStore.getState().currentStep).toBe(
    OnboardingStep.NOT_STARTED
  );
  expect(mockRouterReplace).toHaveBeenCalledWith('/onboarding/welcome');
});
