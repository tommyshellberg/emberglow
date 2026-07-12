import React from 'react';

import { fireEvent, render, screen } from '@/lib/test-utils';

import WelcomeScreen from './welcome';

const mockReplace = jest.fn();
const mockSetCurrentStep = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/store/onboarding-store', () => ({
  OnboardingStep: { SELECTING_CHARACTER: 'SELECTING_CHARACTER' },
  useOnboardingStore: () => ({ setCurrentStep: mockSetCurrentStep }),
}));

describe('WelcomeScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the tagline and subtitle', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText('Level up by logging off')).toBeOnTheScreen();
    expect(
      screen.getByText('Turn phone breaks into epic adventures.')
    ).toBeOnTheScreen();
  });

  it('renders only the logo mark, without a text eyebrow or wordmark title', () => {
    render(<WelcomeScreen />);

    expect(screen.queryByText('BEGIN YOUR JOURNEY')).not.toBeOnTheScreen();
    expect(screen.queryByText('emberglow')).not.toBeOnTheScreen();
  });

  it('advances onboarding to character selection when starting a new journey', () => {
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByText('Begin new journey'));

    expect(mockSetCurrentStep).toHaveBeenCalledWith('SELECTING_CHARACTER');
  });

  it('navigates to login when the existing-account link is pressed', () => {
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByText('Have an account? Log in'));

    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
});
