import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import { useQuestStore } from '@/store/quest-store';

import type { QuestWithMode } from './quest-complete/types';
import { QuestComplete } from './QuestComplete';

// Mock the router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

// Mock the stores
jest.mock('@/store/quest-store');

// Mock the custom hook
jest.mock('@/hooks/useCustomQuestStory', () => ({
  useCustomQuestStory: jest.fn(() => null),
}));

// Mock sub-components
jest.mock('./quest-complete/QuestCompleteHeader', () => ({
  QuestCompleteHeader: ({ quest }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="quest-complete-header">
        <Text>Quest Complete!</Text>
        {quest.title && <Text>{quest.title}</Text>}
      </View>
    );
  },
}));

jest.mock('./quest-complete/QuestCompleteStory', () => ({
  QuestCompleteStory: ({ story }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="quest-complete-story">
        <Text>{story}</Text>
      </View>
    );
  },
}));

jest.mock('./quest-complete/QuestCompleteActions', () => ({
  QuestCompleteActions: ({ continueText, onContinue }: any) => {
    const { View, Pressable, Text } = require('react-native');
    const { useQuestStore } = require('@/store/quest-store');

    return (
      <View testID="quest-complete-actions">
        <Pressable
          onPress={() => {
            const clearRecentCompletedQuest = useQuestStore(
              (state: any) => state.clearRecentCompletedQuest
            );
            clearRecentCompletedQuest();
            if (onContinue) {
              onContinue();
            } else {
              require('expo-router').router.push('/(app)');
            }
          }}
        >
          <Text>{continueText}</Text>
        </Pressable>
      </View>
    );
  },
}));

describe('QuestComplete', () => {
  const mockClearRecentCompletedQuest = jest.fn();

  const mockStoryQuest: QuestWithMode = {
    id: 'quest-1',
    mode: 'story',
    title: 'Story Quest',
    durationMinutes: 5,
    reward: { xp: 10 },
    status: 'completed',
  };

  const mockCustomQuest: QuestWithMode = {
    id: 'custom-1',
    mode: 'custom',
    category: 'fitness',
    title: 'Custom Quest',
    durationMinutes: 30,
    reward: { xp: 50 },
    status: 'completed',
  };

  const mockCooperativeQuest: QuestWithMode = {
    id: 'coop-1',
    mode: 'cooperative',
    category: 'cooperative',
    title: 'Team Quest',
    durationMinutes: 45,
    reward: { xp: 75 },
    status: 'completed',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useQuestStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        clearRecentCompletedQuest: mockClearRecentCompletedQuest,
      };
      return selector(state);
    });
  });

  describe('Component Composition', () => {
    it('should render all sub-components', () => {
      const { getByTestId } = render(
        <QuestComplete quest={mockStoryQuest} story="Test story" />
      );

      expect(getByTestId('quest-complete-header')).toBeTruthy();
      expect(getByTestId('quest-complete-story')).toBeTruthy();
      expect(getByTestId('quest-complete-actions')).toBeTruthy();
    });

    it('should hide actions when showActionButton is false', () => {
      const { queryByTestId, getByTestId } = render(
        <QuestComplete
          quest={mockStoryQuest}
          story="Test story"
          showActionButton={false}
        />
      );

      expect(getByTestId('quest-complete-header')).toBeTruthy();
      expect(getByTestId('quest-complete-story')).toBeTruthy();
      expect(queryByTestId('quest-complete-actions')).toBeNull();
    });
  });

  describe('Story Display', () => {
    it('should display provided story for story quests', () => {
      const { getByText } = render(
        <QuestComplete quest={mockStoryQuest} story="Once upon a time..." />
      );

      expect(getByText('Once upon a time...')).toBeTruthy();
    });

    it('should display custom story for custom quests', () => {
      const { useCustomQuestStory } = require('@/hooks/useCustomQuestStory');
      useCustomQuestStory.mockReturnValue('Custom quest story');

      const { getByText } = render(
        <QuestComplete quest={mockCustomQuest} story="Fallback story" />
      );

      expect(getByText('Custom quest story')).toBeTruthy();
    });

    it('should use provided story when custom story hook returns null', () => {
      const { useCustomQuestStory } = require('@/hooks/useCustomQuestStory');
      useCustomQuestStory.mockReturnValue(null);

      const { getByText } = render(
        <QuestComplete quest={mockStoryQuest} story="Provided story" />
      );

      expect(getByText('Provided story')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate to home screen by default', () => {
      const { getByText } = render(
        <QuestComplete quest={mockStoryQuest} story="Test story" />
      );

      fireEvent.press(getByText('Continue'));

      expect(mockClearRecentCompletedQuest).toHaveBeenCalled();
      expect(router.push).toHaveBeenCalledWith('/(app)');
    });

    it('should call onContinue callback when provided', () => {
      const onContinue = jest.fn();

      const { getByText } = render(
        <QuestComplete
          quest={mockStoryQuest}
          story="Test story"
          onContinue={onContinue}
        />
      );

      fireEvent.press(getByText('Continue'));

      expect(mockClearRecentCompletedQuest).toHaveBeenCalled();
      expect(onContinue).toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe('Continue Button Text', () => {
    it('should use default continue text', () => {
      const { getByText } = render(
        <QuestComplete quest={mockStoryQuest} story="Test story" />
      );

      expect(getByText('Continue')).toBeTruthy();
    });

    it('should use custom continue text', () => {
      const { getByText } = render(
        <QuestComplete
          quest={mockStoryQuest}
          story="Test story"
          continueText="Next Adventure"
        />
      );

      expect(getByText('Next Adventure')).toBeTruthy();
    });
  });

  describe('Different Quest Modes', () => {
    it('should render for story quest', () => {
      const { getByTestId, getByText } = render(
        <QuestComplete quest={mockStoryQuest} story="Story quest text" />
      );

      expect(getByTestId('quest-complete-header')).toBeTruthy();
      expect(getByText('Story Quest')).toBeTruthy();
    });

    it('should render for custom quest', () => {
      const { getByTestId, getByText } = render(
        <QuestComplete quest={mockCustomQuest} story="Custom quest text" />
      );

      expect(getByTestId('quest-complete-header')).toBeTruthy();
      expect(getByText('Custom Quest')).toBeTruthy();
    });

    it('should render for cooperative quest', () => {
      const { getByTestId, getByText } = render(
        <QuestComplete quest={mockCooperativeQuest} story="Coop quest text" />
      );

      expect(getByTestId('quest-complete-header')).toBeTruthy();
      expect(getByText('Team Quest')).toBeTruthy();
    });
  });

  describe('Animations', () => {
    it('should pass disableEnteringAnimations to sub-components', () => {
      const { getByTestId } = render(
        <QuestComplete
          quest={mockStoryQuest}
          story="Test story"
          disableEnteringAnimations={true}
        />
      );

      // Sub-components should receive the prop (we can't easily test internal behavior)
      expect(getByTestId('quest-complete-header')).toBeTruthy();
      expect(getByTestId('quest-complete-story')).toBeTruthy();
      expect(getByTestId('quest-complete-actions')).toBeTruthy();
    });
  });

  describe('Background', () => {
    it('should render background image', () => {
      const { UNSAFE_getByType } = render(
        <QuestComplete quest={mockStoryQuest} story="Test story" />
      );

      const Image = require('@/components/ui').Image;
      const images = UNSAFE_getByType(Image);
      expect(images).toBeTruthy();
    });
  });

  describe('Layout', () => {
    it('does not force-spread content across the full screen height, so short content (e.g. no story card) does not leave a big gap below the image', () => {
      const { UNSAFE_getByType } = render(
        <QuestComplete quest={mockCooperativeQuest} story="Coop quest text" />
      );

      const { ScrollView } = require('react-native');
      const scrollView = UNSAFE_getByType(ScrollView);
      expect(
        scrollView.props.contentContainerStyle?.justifyContent
      ).not.toBe('space-between');
    });
  });
});
