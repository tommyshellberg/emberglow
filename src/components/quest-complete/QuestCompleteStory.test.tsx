import { render } from '@testing-library/react-native';
import React from 'react';

import { QuestCompleteStory } from './QuestCompleteStory';
import type { QuestWithMode } from './types';

// Mock StoryNarration
jest.mock('@/components/StoryNarration', () => ({
  StoryNarration: ({ quest }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="story-narration-mock">
        <Text>Audio Controls for {quest.id}</Text>
      </View>
    );
  },
}));

describe('QuestCompleteStory', () => {
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
    title: 'Coop Quest',
    durationMinutes: 45,
    reward: { xp: 75 },
    status: 'completed',
  };

  describe('Story Display', () => {
    it('should render story text', () => {
      const story = 'Once upon a time, a hero embarked on a great adventure.';
      const { getByText } = render(
        <QuestCompleteStory story={story} quest={mockStoryQuest} />
      );
      expect(getByText(story)).toBeTruthy();
    });

    it('should render long story text', () => {
      const longStory = 'A'.repeat(1000);
      const { getByText } = render(
        <QuestCompleteStory story={longStory} quest={mockStoryQuest} />
      );
      expect(getByText(longStory)).toBeTruthy();
    });

    it('should render default message when story is empty', () => {
      const { getByText } = render(
        <QuestCompleteStory story="" quest={mockStoryQuest} />
      );
      expect(
        getByText('Congratulations on completing your quest!')
      ).toBeTruthy();
    });
  });

  describe('StoryNarration Integration', () => {
    it('should show StoryNarration for story quests', () => {
      const { getByTestId } = render(
        <QuestCompleteStory story="Test story" quest={mockStoryQuest} />
      );
      expect(getByTestId('story-narration-mock')).toBeTruthy();
    });

    it('should not show StoryNarration for custom quests', () => {
      const { queryByTestId } = render(
        <QuestCompleteStory story="Test story" quest={mockCustomQuest} />
      );
      expect(queryByTestId('story-narration-mock')).toBeNull();
    });

    it('should not show StoryNarration for cooperative quests', () => {
      const { queryByTestId } = render(
        <QuestCompleteStory story="Test story" quest={mockCooperativeQuest} />
      );
      expect(queryByTestId('story-narration-mock')).toBeNull();
    });
  });

  describe('ScrollView', () => {
    it('should render story in a scrollable view', () => {
      const { UNSAFE_getByType } = render(
        <QuestCompleteStory story="Test story" quest={mockStoryQuest} />
      );
      const ScrollView = require('react-native').ScrollView;
      expect(UNSAFE_getByType(ScrollView)).toBeTruthy();
    });

    it('should show vertical scroll indicator', () => {
      const { UNSAFE_getByType } = render(
        <QuestCompleteStory story="Test story" quest={mockStoryQuest} />
      );
      const ScrollView = require('react-native').ScrollView;
      const scrollView = UNSAFE_getByType(ScrollView);
      expect(scrollView.props.showsVerticalScrollIndicator).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label for story region', () => {
      const { getByLabelText } = render(
        <QuestCompleteStory story="Test story" quest={mockStoryQuest} />
      );
      expect(getByLabelText('Quest completion story')).toBeTruthy();
    });

    it('should have accessible role for story text', () => {
      const { getAllByRole } = render(
        <QuestCompleteStory story="Test story" quest={mockStoryQuest} />
      );
      const textElements = getAllByRole('text');
      expect(textElements.length).toBeGreaterThan(0);
    });
  });

  describe('Different Quest Modes', () => {
    it('should render correctly for story quest', () => {
      const { getByText, getByTestId } = render(
        <QuestCompleteStory story="Story quest text" quest={mockStoryQuest} />
      );
      expect(getByText('Story quest text')).toBeTruthy();
      expect(getByTestId('story-narration-mock')).toBeTruthy();
    });

    it('should render correctly for custom quest', () => {
      const { getByText, queryByTestId } = render(
        <QuestCompleteStory story="Custom quest text" quest={mockCustomQuest} />
      );
      expect(getByText('Custom quest text')).toBeTruthy();
      expect(queryByTestId('story-narration-mock')).toBeNull();
    });

    it('should render correctly for cooperative quest', () => {
      const { getByText, queryByTestId } = render(
        <QuestCompleteStory
          story="Cooperative quest text"
          quest={mockCooperativeQuest}
        />
      );
      expect(getByText('Cooperative quest text')).toBeTruthy();
      expect(queryByTestId('story-narration-mock')).toBeNull();
    });
  });

  describe('Cooperative Quest Card', () => {
    it('should not wrap cooperative quest text in a Card', () => {
      const { UNSAFE_queryByType } = render(
        <QuestCompleteStory
          story="Cooperative quest text"
          quest={mockCooperativeQuest}
        />
      );
      const Card = require('@/components/ui/card').Card;
      expect(UNSAFE_queryByType(Card)).toBeNull();
    });

    it('should still wrap story quest text in a Card', () => {
      const { UNSAFE_queryByType } = render(
        <QuestCompleteStory story="Story quest text" quest={mockStoryQuest} />
      );
      const Card = require('@/components/ui/card').Card;
      expect(UNSAFE_queryByType(Card)).toBeTruthy();
    });
  });
});
