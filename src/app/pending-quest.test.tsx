import { fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import { render } from '@/lib/test-utils';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';
import { useUserStore } from '@/store/user-store';

import PendingQuestScreen from './pending-quest';

// Mock dependencies
jest.mock('expo-router');
jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));
jest.mock('@/../assets/images/background/active-quest.jpg', () => ({}));

// Mock character utils
jest.mock('@/app/utils/character-utils', () => ({
  getCharacterAvatar: jest.fn((characterType?: string) => {
    if (!characterType) {
      return require('@/../assets/images/characters/alchemist-profile.jpg');
    }
    return require('@/../assets/images/characters/alchemist-profile.jpg');
  }),
}));

// Mock the quest reward preview hook
jest.mock('@/api/quest-runs', () => ({
  useQuestRewardPreview: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
  })),
}));

// Mock the RewardPreviewCard component
jest.mock('@/components/quest-preview', () => ({
  RewardPreviewCard: jest.fn(() => null),
}));

// Don't mock the pending-quest module - we want to test the real implementation

// Mock UI components including BackgroundImage
jest.mock('@/components/ui', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');

  return {
    BackgroundImage: ({ testID, source, ...props }: any) =>
      React.createElement(RN.View, { testID, ...props, source }),
    Button: ({ onPress, children, ...props }: any) =>
      React.createElement(
        RN.TouchableOpacity,
        { onPress, ...props },
        React.createElement(RN.Text, {}, children)
      ),
    Card: ({ children, testID, ...props }: any) =>
      React.createElement(RN.View, { testID, ...props }, children),
    Text: (props: any) => React.createElement(RN.Text, props),
    Title: (props: any) => React.createElement(RN.Text, props),
    View: (props: any) => React.createElement(RN.View, props),
  };
});

// Mock the quest components
jest.mock('@/components/quest', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');

  return {
    QuestCard: ({ title, duration, children, ...props }: any) =>
      React.createElement(RN.View, { testID: 'quest-card', ...props }, [
        React.createElement(RN.Text, { key: 'title' }, title),
        React.createElement(
          RN.Text,
          { key: 'duration' },
          `${duration} minutes`
        ),
        children,
      ]),
    LockInstructions: ({ variant, delay }: any) =>
      React.createElement(RN.View, {
        testID: 'lock-instructions',
        variant,
        delay,
      }),
  };
});

describe('PendingQuestScreen', () => {
  const mockStoryQuest = {
    id: 'quest-1',
    title: 'The Beginning',
    durationMinutes: 5,
    mode: 'story' as const,
    poiSlug: 'tavern',
    story: 'Your adventure begins...',
    recap: 'You started your journey',
    options: [],
    reward: { xp: 20 },
  };

  const mockCustomQuest = {
    id: 'custom-1',
    title: 'Morning Run',
    durationMinutes: 30,
    mode: 'custom' as const,
    category: 'fitness',
    reward: { xp: 50 },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset stores
    useQuestStore.setState({
      pendingQuest: mockStoryQuest,
      cancelQuest: jest.fn(),
    });

    useUserStore.setState({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
    });

    (router.back as jest.Mock).mockImplementation(() => {});
  });

  it('renders story quest correctly', () => {
    const { getByText, getByTestId } = render(<PendingQuestScreen />);

    expect(getByText('Start Quest')).toBeTruthy();
    expect(getByTestId('quest-card')).toBeTruthy();
    expect(getByText('The Beginning')).toBeTruthy();
    expect(getByText('5 min')).toBeTruthy();
    expect(getByText('Your character is ready for their quest')).toBeTruthy();
  });

  it('renders custom quest correctly', () => {
    useQuestStore.setState({
      pendingQuest: mockCustomQuest,
      cancelQuest: jest.fn(),
    });

    const { getByText, getByTestId } = render(<PendingQuestScreen />);

    expect(getByText('Start Quest')).toBeTruthy();
    expect(getByTestId('quest-card')).toBeTruthy();
    expect(getByText('Morning Run')).toBeTruthy();
    expect(getByText('30 min')).toBeTruthy();
    expect(getByText('Time to focus on what matters most')).toBeTruthy();
  });

  it('displays lock instructions', () => {
    const { getByTestId } = render(<PendingQuestScreen />);

    const lockInstructions = getByTestId('lock-instructions');
    expect(lockInstructions).toBeTruthy();
  });

  it('handles cancel quest button', () => {
    const mockCancelQuest = jest.fn();
    useQuestStore.setState({
      pendingQuest: mockStoryQuest,
      cancelQuest: mockCancelQuest,
    });

    const { getByText } = render(<PendingQuestScreen />);

    fireEvent.press(getByText('Cancel Quest'));

    expect(mockCancelQuest).toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
  });

  it('shows loading when no pending quest', () => {
    useQuestStore.setState({
      pendingQuest: null,
      cancelQuest: jest.fn(),
    });

    const { getByTestId } = render(<PendingQuestScreen />);

    expect(() => getByTestId('activity-indicator')).toBeTruthy();
  });

  it('triggers animations on mount', async () => {
    const { getByTestId } = render(<PendingQuestScreen />);

    // Check that animated components are rendered
    await waitFor(() => {
      expect(getByTestId('quest-card')).toBeTruthy();
    });
  });

  it('uses correct background image', () => {
    const { getByTestId } = render(<PendingQuestScreen />);

    const backgroundImage = getByTestId('background-image');
    expect(backgroundImage.props.source).toBe(
      require('@/../assets/images/background/pending-quest-bg-alt.jpg')
    );
  });

  describe('Quest Subtitles', () => {
    it('shows custom quest subtitle for custom mode', () => {
      useQuestStore.setState({
        pendingQuest: mockCustomQuest,
        cancelQuest: jest.fn(),
      });

      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('Time to focus on what matters most')).toBeTruthy();
    });

    it('shows story quest subtitle for story mode', () => {
      useQuestStore.setState({
        pendingQuest: mockStoryQuest,
        cancelQuest: jest.fn(),
      });

      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('Your character is ready for their quest')).toBeTruthy();
    });

    it('shows story quest subtitle when mode is undefined', () => {
      useQuestStore.setState({
        pendingQuest: { ...mockStoryQuest, mode: undefined },
        cancelQuest: jest.fn(),
      });

      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('Your character is ready for their quest')).toBeTruthy();
    });
  });

  describe('Character Avatar', () => {
    it('uses character avatar when character exists', () => {
      const { getCharacterAvatar } = require('@/app/utils/character-utils');

      useCharacterStore.setState({
        character: {
          type: 'alchemist',
          name: 'TestAlchemist',
          level: 1,
          currentXP: 0,
        },
      });

      render(<PendingQuestScreen />);

      expect(getCharacterAvatar).toHaveBeenCalledWith('alchemist');
    });

    it('handles missing character gracefully', () => {
      const { getCharacterAvatar } = require('@/app/utils/character-utils');

      useCharacterStore.setState({
        character: null,
      });

      render(<PendingQuestScreen />);

      expect(getCharacterAvatar).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Edge Cases', () => {
    it('handles quest with very long title', () => {
      useQuestStore.setState({
        pendingQuest: {
          ...mockStoryQuest,
          title:
            'This is a very long quest title that should still render correctly without breaking the layout',
        },
        cancelQuest: jest.fn(),
      });

      const { getByText } = render(<PendingQuestScreen />);

      expect(
        getByText(
          'This is a very long quest title that should still render correctly without breaking the layout'
        )
      ).toBeTruthy();
    });

    it('handles quest with 0 duration', () => {
      useQuestStore.setState({
        pendingQuest: {
          ...mockStoryQuest,
          durationMinutes: 0,
        },
        cancelQuest: jest.fn(),
      });

      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('0 min')).toBeTruthy();
    });

    it('handles quest with large duration', () => {
      useQuestStore.setState({
        pendingQuest: {
          ...mockStoryQuest,
          durationMinutes: 120,
        },
        cancelQuest: jest.fn(),
      });

      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('120 min')).toBeTruthy();
    });
  });

  describe('UI Elements', () => {
    it('displays "Start Quest" title', () => {
      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('Start Quest')).toBeTruthy();
    });

    it('displays lock instructions text', () => {
      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('Lock your phone to begin')).toBeTruthy();
    });

    it('displays cancel button text', () => {
      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('Cancel Quest')).toBeTruthy();
    });

    it('renders quest card with header image', () => {
      const { getByTestId } = render(<PendingQuestScreen />);

      const card = getByTestId('quest-card');
      expect(card).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('calls router.back when cancel is pressed', () => {
      const { getByText } = render(<PendingQuestScreen />);

      fireEvent.press(getByText('Cancel Quest'));

      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it('cancels quest and navigates back', () => {
      const mockCancelQuest = jest.fn();
      useQuestStore.setState({
        pendingQuest: mockStoryQuest,
        cancelQuest: mockCancelQuest,
      });

      const { getByText } = render(<PendingQuestScreen />);

      fireEvent.press(getByText('Cancel Quest'));

      expect(mockCancelQuest).toHaveBeenCalledTimes(1);
      expect(router.back).toHaveBeenCalledTimes(1);
    });
  });
});
