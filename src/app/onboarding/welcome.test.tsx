import React from 'react';

import { render, screen } from '@/lib/test-utils';

import WelcomeScreen from './welcome';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock('@/store/onboarding-store', () => ({
  OnboardingStep: { SELECTING_CHARACTER: 'SELECTING_CHARACTER' },
  useOnboardingStore: () => ({ setCurrentStep: jest.fn() }),
}));

describe('WelcomeScreen', () => {
  it('renders the brand title and tagline', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText('emberglow')).toBeOnTheScreen();
    expect(screen.getByText('Level Up By Logging Off')).toBeOnTheScreen();
  });

  it('renders the BEGIN YOUR JOURNEY eyebrow', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText('BEGIN YOUR JOURNEY')).toBeOnTheScreen();
  });
});
