import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';

import {
  requestNotificationPermissions,
  setupNotifications,
} from '@/lib/services/notifications';
import { useCharacterStore } from '@/store/character-store';
import { OnboardingStep, useOnboardingStore } from '@/store/onboarding-store';
import { useUserStore } from '@/store/user-store';

import AppIntroductionScreen from './app-introduction';

// Mock API URL for testing
process.env.API_URL = 'http://test-api.example.com';

// Mock UI components
jest.mock('@/components/ui/focus-aware-status-bar', () => ({
  FocusAwareStatusBar: () => null,
}));

// Mock notification service
jest.mock('@/lib/services/notifications', () => ({
  setupNotifications: jest.fn(),
  requestNotificationPermissions: jest.fn().mockResolvedValue(true),
}));

// Mock Expo Notifications to resolve immediately during tests
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));

// Mock expo-router
jest.mock('expo-router');

// Mock character store
jest.mock('@/store/character-store');

// Mock user store
jest.mock('@/store/user-store');

describe('AppIntroductionScreen', () => {
  const mockRouter = {
    replace: jest.fn(),
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    // Default implementation for stores returns no data
    (useCharacterStore as jest.Mock).mockImplementation((selector) =>
      selector({ character: null })
    );
    (useUserStore as jest.Mock).mockImplementation((selector) =>
      selector({ user: null })
    );
    // Stub the store setter:
    useOnboardingStore.getState().setCurrentStep = jest.fn();
  });

  it('starts at intro step', async () => {
    const { getByText } = render(<AppIntroductionScreen />);

    // Use waitFor to handle the async permission check
    await waitFor(() => {
      expect(getByText('How it works')).toBeTruthy();
      expect(getByText('Quests reward stepping away')).toBeTruthy();
      expect(
        getByText(
          'Not timers. Not blockers. An adventure that only moves when you do.'
        )
      ).toBeTruthy();
      expect(getByText('Continue')).toBeTruthy();
    });
  });

  it("moves to notifications step after pressing 'Continue'", async () => {
    const { getByText } = render(<AppIntroductionScreen />);

    // Wait for initial render to complete
    await waitFor(() => {
      expect(getByText('Continue')).toBeTruthy();
    });

    // Press "Continue" button
    fireEvent.press(getByText('Continue'));

    // Check that we've moved to the notifications step
    await waitFor(() => {
      expect(getByText('One thing first')).toBeTruthy();
      expect(
        getByText('Watch the quest without waking your phone')
      ).toBeTruthy();
      expect(getByText('Allow notifications')).toBeTruthy();
    });
  });

  it("requests notification permissions when 'Allow notifications' is pressed", async () => {
    const { getByText } = render(<AppIntroductionScreen />);

    // Wait for initial render to complete
    await waitFor(() => {
      expect(getByText('Continue')).toBeTruthy();
    });

    // Navigate to notifications step
    fireEvent.press(getByText('Continue'));

    // Wait for the next step to appear
    await waitFor(() => {
      expect(getByText('Allow notifications')).toBeTruthy();
    });

    // Press "Allow notifications" button
    fireEvent.press(getByText('Allow notifications'));

    // Check that permissions were requested
    await waitFor(() => {
      expect(requestNotificationPermissions).toHaveBeenCalled();
      expect(setupNotifications).toHaveBeenCalled();
    });
  });

  it('completes onboarding step after requesting permissions', async () => {
    const { getByText } = render(<AppIntroductionScreen />);

    // Wait for initial render to complete
    await waitFor(() => {
      expect(getByText('Continue')).toBeTruthy();
    });

    // Navigate to notifications step
    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(getByText('Allow notifications')).toBeTruthy();
    });

    // Press "Allow notifications" button
    fireEvent.press(getByText('Allow notifications'));

    // Check that onboarding step was updated
    await waitFor(() => {
      expect(useOnboardingStore.getState().setCurrentStep).toHaveBeenCalledWith(
        OnboardingStep.STARTING_FIRST_QUEST
      );
    });
  });

  it("skips notifications when 'Not now' is pressed", async () => {
    const { getByText } = render(<AppIntroductionScreen />);

    // Wait for initial render to complete
    await waitFor(() => {
      expect(getByText('Continue')).toBeTruthy();
    });

    // Navigate through the steps
    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(getByText('Allow notifications')).toBeTruthy();
      expect(getByText('Not now')).toBeTruthy();
    });

    // Press "Not now" button
    fireEvent.press(getByText('Not now'));

    // Check that it still completes the notifications step
    expect(useOnboardingStore.getState().setCurrentStep).toHaveBeenCalledWith(
      OnboardingStep.STARTING_FIRST_QUEST
    );
  });

  it('handles notification permission errors gracefully', async () => {
    // Mock a permission request error
    (requestNotificationPermissions as jest.Mock).mockRejectedValueOnce(
      new Error('Permission request failed')
    );

    const { getByText } = render(<AppIntroductionScreen />);

    // Wait for initial render to complete
    await waitFor(() => {
      expect(getByText('Continue')).toBeTruthy();
    });

    // Navigate to notifications step
    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(getByText('Allow notifications')).toBeTruthy();
    });

    // Press "Allow notifications" button
    fireEvent.press(getByText('Allow notifications'));

    // Even with an error, the flow should continue
    await waitFor(() => {
      expect(setupNotifications).toHaveBeenCalled();
      expect(useOnboardingStore.getState().setCurrentStep).toHaveBeenCalledWith(
        OnboardingStep.STARTING_FIRST_QUEST
      );
    });
  });

  it('detects existing character data', async () => {
    // Mock existing character data
    (useCharacterStore as jest.Mock).mockImplementation((selector) =>
      selector({ character: { name: 'TestChar', type: 'wizard' } })
    );

    const { getByText } = render(<AppIntroductionScreen />);

    await waitFor(() => {
      expect(getByText('Quests reward stepping away')).toBeTruthy();
    });
  });

  it("shows the hero's name in the lock-screen mock card", async () => {
    // Mock existing character data. Same mockImplementation pattern as the
    // rest of the file, but cast via `unknown` so this line doesn't add to
    // the file's pre-existing TS2352 baseline.
    (useCharacterStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ character: { name: 'TestChar', type: 'wizard' } })
    );

    const { getByText } = render(<AppIntroductionScreen />);

    await waitFor(() => {
      expect(getByText('Continue')).toBeTruthy();
    });

    // Navigate to the notifications step, where the mock card renders
    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(
        getByText('TestChar is on a quest · 72 XP on return')
      ).toBeTruthy();
    });
  });

  it("falls back to 'Your hero' in the mock card when no character exists", async () => {
    // Default beforeEach mock already returns { character: null }
    const { getByText } = render(<AppIntroductionScreen />);

    await waitFor(() => {
      expect(getByText('Continue')).toBeTruthy();
    });

    // Navigate to the notifications step, where the mock card renders
    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(
        getByText('Your hero is on a quest · 72 XP on return')
      ).toBeTruthy();
    });
  });

  it('detects existing user data', async () => {
    // Mock existing user data
    (useUserStore as jest.Mock).mockImplementation((selector) =>
      selector({
        user: {
          id: '123',
          email: 'test@example.com',
        },
      })
    );

    const { getByText } = render(<AppIntroductionScreen />);

    await waitFor(() => {
      expect(getByText('Quests reward stepping away')).toBeTruthy();
    });
  });
});
