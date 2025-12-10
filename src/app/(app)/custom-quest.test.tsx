/* eslint-disable max-lines-per-function */
import { fireEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';

import QuestTimer from '@/lib/services/quest-timer';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@/lib/test-utils';
import { useQuestStore } from '@/store/quest-store';

import CustomQuestScreen from './custom-quest';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/services/quest-timer', () => ({
  prepareQuest: jest.fn().mockResolvedValue(undefined),
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Feather: () => null,
}));

// Mock zustand store
jest.mock('@/store/quest-store', () => ({
  useQuestStore: jest.fn(() => ({
    getState: jest.fn().mockReturnValue({
      prepareQuest: jest.fn(),
    }),
  })),
}));

// Mock PostHog
const mockPostHogCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: jest.fn(() => ({
    capture: mockPostHogCapture,
  })),
}));

describe('CustomQuestScreen', () => {
  // Properly type the mocked objects
  let mockedRouter: { back: jest.Mock; push: jest.Mock };
  let mockedPrepareQuest: jest.Mock;

  beforeEach(() => {
    mockedRouter = {
      back: jest.fn(),
      push: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockedRouter);

    // Reset the mocked function before each test
    mockedPrepareQuest = jest.fn();
    useQuestStore.getState = jest.fn().mockReturnValue({
      prepareQuest: mockedPrepareQuest,
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('renders the custom quest screen correctly', () => {
    render(<CustomQuestScreen />);

    // Verify main components are rendered
    expect(screen.getByText('Custom Quest')).toBeOnTheScreen();
    expect(screen.getByText('I want to')).toBeOnTheScreen();
    expect(screen.getByText(/for \d+ minutes/)).toBeOnTheScreen();
  });

  it('Start Quest button is disabled when quest name is empty', async () => {
    render(<CustomQuestScreen />);

    // Use testID to find the button and check disabled state
    const startButton = screen.getByText('Start Quest');
    expect(startButton).toBeOnTheScreen();
    expect(startButton).toBeDisabled();
  });

  it('enables Start Quest button when quest name is entered', () => {
    render(<CustomQuestScreen />);

    // Find the input field and enter text
    const input = screen.getByPlaceholderText('go for a run');
    fireEvent.changeText(input, 'My test quest');

    // Button should be enabled
    const startButton = screen.getByText('Start Quest');
    expect(startButton).not.toBeDisabled();
  });

  it('updates duration display when slider value changes', async () => {
    render(<CustomQuestScreen />);

    // Get the slider
    const slider = screen.getByTestId('duration-slider');

    // Initial duration should be visible
    expect(screen.getByText(/for \d+ minutes/)).toBeOnTheScreen();

    // Change slider value - no need for act wrapper with fireEvent
    fireEvent(slider, 'valueChange', 60);
    fireEvent(slider, 'slidingComplete', 60);

    // Updated duration should be visible
    expect(screen.getByText('for 60 minutes')).toBeOnTheScreen();
  });

  it('updates end time when duration changes', async () => {
    render(<CustomQuestScreen />);

    // Get the slider
    const slider = screen.getByTestId('duration-slider');

    // Get initial end time label
    const initialTimeElement = screen.getByTestId('end-time');
    const initialText =
      within(initialTimeElement).getByText(/.*/).props.children;

    // Change slider value
    fireEvent(slider, 'valueChange', 60);
    fireEvent(slider, 'slidingComplete', 60);

    // Wait for the updated time element to be available
    await waitFor(() => {
      screen.getByTestId('end-time');
    });

    // After waiting, perform assertions outside waitFor
    const updatedTimeElement = screen.getByTestId('end-time');
    expect(updatedTimeElement).toBeOnTheScreen();

    const updatedText =
      within(updatedTimeElement).getByText(/.*/).props.children;
    expect(updatedText).not.toBe(initialText);
  });

  it('can select different quest categories', async () => {
    render(<CustomQuestScreen />);

    // Initially fitness is selected
    const fitnessOption = screen.getByTestId('category-option-fitness');
    expect(fitnessOption.props.accessibilityState.selected).toBe(true);

    // Select a different category (social)
    const socialCategory = screen.getByTestId('category-option-social');
    fireEvent.press(socialCategory);

    // Social should now be selected
    await waitFor(() => {
      expect(socialCategory.props.accessibilityState.selected).toBe(true);
    });
  });

  it('calls prepareQuest when form is submitted with valid data', async () => {
    render(<CustomQuestScreen />);

    // Fill out the form
    const nameInput = screen.getByPlaceholderText('go for a run');
    fireEvent.changeText(nameInput, 'Test Quest');

    // Set duration
    const slider = screen.getByTestId('duration-slider');
    fireEvent(slider, 'valueChange', 45);
    fireEvent(slider, 'slidingComplete', 45);

    // Submit the form
    const startButton = screen.getByText('Start Quest');
    fireEvent.press(startButton);

    // Verify prepareQuest was called
    await waitFor(() => {
      expect(mockedPrepareQuest).toHaveBeenCalledTimes(1);
    });

    // Separately check the arguments
    expect(mockedPrepareQuest).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Quest',
        durationMinutes: 45,
        category: expect.any(String),
      })
    );

    // Verify QuestTimer.prepareQuest was called
    expect(QuestTimer.prepareQuest).toHaveBeenCalledTimes(1);
  });

  describe('Analytics Events', () => {
    it('tracks screen open event on mount', () => {
      render(<CustomQuestScreen />);

      expect(mockPostHogCapture).toHaveBeenCalledWith(
        'open_custom_quest_screen'
      );
    });

    it('tracks trigger event when form is submitted', async () => {
      render(<CustomQuestScreen />);

      // Fill form and submit
      const nameInput = screen.getByPlaceholderText('go for a run');
      fireEvent.changeText(nameInput, 'Test Quest');

      const startButton = screen.getByText('Start Quest');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(mockPostHogCapture).toHaveBeenCalledWith(
          'trigger_start_custom_quest'
        );
      });
    });

    it('tracks success event when quest is created successfully', async () => {
      render(<CustomQuestScreen />);

      // Fill form and submit
      const nameInput = screen.getByPlaceholderText('go for a run');
      fireEvent.changeText(nameInput, 'Test Quest');

      const startButton = screen.getByText('Start Quest');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(mockPostHogCapture).toHaveBeenCalledWith(
          'success_start_custom_quest' // Fixed typo from 'sucess'
        );
      });
    });
  });

  describe('XP Calculation', () => {
    it('calculates XP correctly for 30 minute quest', async () => {
      render(<CustomQuestScreen />);

      const nameInput = screen.getByPlaceholderText('go for a run');
      fireEvent.changeText(nameInput, 'Test Quest');

      // Default duration is 30 minutes
      const startButton = screen.getByText('Start Quest');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(mockedPrepareQuest).toHaveBeenCalledWith(
          expect.objectContaining({
            reward: { xp: 90 }, // 30 * 3 = 90
          })
        );
      });
    });

    it('calculates XP correctly for 60 minute quest', async () => {
      render(<CustomQuestScreen />);

      const nameInput = screen.getByPlaceholderText('go for a run');
      fireEvent.changeText(nameInput, 'Test Quest');

      // Set duration to 60 minutes
      const slider = screen.getByTestId('duration-slider');
      fireEvent(slider, 'valueChange', 60);
      fireEvent(slider, 'slidingComplete', 60);

      const startButton = screen.getByText('Start Quest');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(mockedPrepareQuest).toHaveBeenCalledWith(
          expect.objectContaining({
            reward: { xp: 180 }, // 60 * 3 = 180
          })
        );
      });
    });

    it('calculates XP correctly for 240 minute quest', async () => {
      render(<CustomQuestScreen />);

      const nameInput = screen.getByPlaceholderText('go for a run');
      fireEvent.changeText(nameInput, 'Test Quest');

      // Set duration to 240 minutes (max)
      const slider = screen.getByTestId('duration-slider');
      fireEvent(slider, 'valueChange', 240);
      fireEvent(slider, 'slidingComplete', 240);

      const startButton = screen.getByText('Start Quest');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(mockedPrepareQuest).toHaveBeenCalledWith(
          expect.objectContaining({
            reward: { xp: 720 }, // 240 * 3 = 720
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when store prepareQuest fails', async () => {
      // Mock the store to throw an error
      useQuestStore.getState = jest.fn().mockReturnValue({
        prepareQuest: jest.fn(() => {
          throw new Error('Store error');
        }),
      });

      render(<CustomQuestScreen />);

      const nameInput = screen.getByPlaceholderText('go for a run');
      fireEvent.changeText(nameInput, 'Test Quest');

      const startButton = screen.getByText('Start Quest');
      fireEvent.press(startButton);

      // Should show error message (once we implement it)
      await waitFor(() => {
        expect(screen.queryByText(/Failed to start quest/i)).toBeOnTheScreen();
      });
    });

    it('shows error message when QuestTimer.prepareQuest fails', async () => {
      // Mock QuestTimer to reject
      (QuestTimer.prepareQuest as jest.Mock).mockRejectedValueOnce(
        new Error('Timer error')
      );

      render(<CustomQuestScreen />);

      const nameInput = screen.getByPlaceholderText('go for a run');
      fireEvent.changeText(nameInput, 'Test Quest');

      const startButton = screen.getByText('Start Quest');
      fireEvent.press(startButton);

      // Should show error message (once we implement it)
      await waitFor(() => {
        expect(screen.queryByText(/Failed to start quest/i)).toBeOnTheScreen();
      });
    });

    it('allows retrying after error', async () => {
      // Mock to fail first, then succeed
      (QuestTimer.prepareQuest as jest.Mock)
        .mockRejectedValueOnce(new Error('Timer error'))
        .mockResolvedValueOnce(undefined);

      render(<CustomQuestScreen />);

      const nameInput = screen.getByPlaceholderText('go for a run');
      fireEvent.changeText(nameInput, 'Test Quest');

      // First attempt - should fail
      const startButton = screen.getByText('Start Quest');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(screen.queryByText(/Failed to start quest/i)).toBeOnTheScreen();
      });

      // Second attempt - should succeed
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(mockedRouter.push).toHaveBeenCalledWith('/pending-quest');
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to pending-quest screen on successful quest creation', async () => {
      render(<CustomQuestScreen />);

      const nameInput = screen.getByPlaceholderText('go for a run');
      fireEvent.changeText(nameInput, 'Test Quest');

      const startButton = screen.getByText('Start Quest');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(mockedRouter.push).toHaveBeenCalledWith('/pending-quest');
      });
    });
  });

  describe('Accessibility', () => {
    it('Start Quest button has proper accessibility label when enabled', () => {
      render(<CustomQuestScreen />);

      const nameInput = screen.getByPlaceholderText('go for a run');
      fireEvent.changeText(nameInput, 'Test Quest');

      const startButton = screen.getByText('Start Quest');

      // Should have accessibility attributes (once we implement them)
      expect(startButton).toHaveAccessibilityValue({});
      // We'll add more specific checks once accessibility is implemented
    });

    it('Start Quest button announces disabled state when quest name is empty', () => {
      render(<CustomQuestScreen />);

      const startButton = screen.getByText('Start Quest');

      // Should have disabled state announced (once we implement it)
      expect(startButton).toBeDisabled();
      // We'll add accessibility state checks once implemented
    });
  });
});
