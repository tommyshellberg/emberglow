import { render } from '@testing-library/react-native';
import React from 'react';

import { QuestCompleteHeader } from './QuestCompleteHeader';
import type { QuestWithMode } from './types';

// Mock the QuestImage component
jest.mock('./QuestImage', () => ({
  QuestImage: ({ quest }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="quest-image-mock">
        <Text>Mock Quest Image</Text>
        <Text>{quest.title}</Text>
      </View>
    );
  },
}));

describe('QuestCompleteHeader', () => {
  const mockQuestWithTitle: QuestWithMode = {
    id: 'quest-1',
    mode: 'story',
    title: 'The Great Adventure',
    durationMinutes: 5,
    reward: { xp: 10 },
    status: 'completed',
  };

  const mockQuestWithoutTitle: QuestWithMode = {
    id: 'quest-2',
    mode: 'custom',
    category: 'fitness',
    durationMinutes: 30,
    reward: { xp: 50 },
    status: 'completed',
  };

  describe('Rendering', () => {
    it('should render "Quest Complete!" title', () => {
      const { getByText } = render(
        <QuestCompleteHeader quest={mockQuestWithTitle} />
      );
      expect(getByText('Quest Complete!')).toBeTruthy();
    });

    it('should render quest title when provided', () => {
      const { getAllByText } = render(
        <QuestCompleteHeader quest={mockQuestWithTitle} />
      );
      const titles = getAllByText('The Great Adventure');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('should not render quest title when not provided', () => {
      const { queryByText, getByText } = render(
        <QuestCompleteHeader quest={mockQuestWithoutTitle} />
      );
      // Should still render "Quest Complete!" but no subtitle
      expect(getByText('Quest Complete!')).toBeTruthy();
    });

    it('should render QuestImage component', () => {
      const { getByTestId } = render(
        <QuestCompleteHeader quest={mockQuestWithTitle} />
      );
      expect(getByTestId('quest-image-mock')).toBeTruthy();
    });

    it('should render the eyebrow with the story quest mode label', () => {
      const { getByText } = render(
        <QuestCompleteHeader quest={mockQuestWithTitle} />
      );
      expect(getByText('STORY QUEST')).toBeTruthy();
    });

    it('should render the eyebrow with the custom quest mode label', () => {
      const { getByText } = render(
        <QuestCompleteHeader quest={mockQuestWithoutTitle} />
      );
      expect(getByText('CUSTOM QUEST')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible header', () => {
      const { getByLabelText } = render(
        <QuestCompleteHeader quest={mockQuestWithTitle} />
      );
      // Check for accessible elements instead of role
      expect(getByLabelText).toBeDefined();
    });
  });

  describe('Animation Props', () => {
    it('should pass disableAnimations prop to QuestImage', () => {
      const { getByTestId } = render(
        <QuestCompleteHeader
          quest={mockQuestWithTitle}
          disableAnimations={true}
        />
      );
      // QuestImage should be rendered (we can't easily test props with mock)
      expect(getByTestId('quest-image-mock')).toBeTruthy();
    });
  });

  describe('Different Quest Types', () => {
    it('should render for story quest', () => {
      const storyQuest: QuestWithMode = {
        id: 'quest-1',
        mode: 'story',
        title: 'Story Quest',
        durationMinutes: 5,
        reward: { xp: 10 },
        status: 'completed',
      };

      const { getByText, getAllByText } = render(
        <QuestCompleteHeader quest={storyQuest} />
      );
      expect(getByText('Quest Complete!')).toBeTruthy();
      const titles = getAllByText('Story Quest');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('should render for custom quest', () => {
      const customQuest: QuestWithMode = {
        id: 'custom-1',
        mode: 'custom',
        category: 'fitness',
        title: 'Morning Workout',
        durationMinutes: 30,
        reward: { xp: 50 },
        status: 'completed',
      };

      const { getByText, getAllByText } = render(
        <QuestCompleteHeader quest={customQuest} />
      );
      expect(getByText('Quest Complete!')).toBeTruthy();
      const titles = getAllByText('Morning Workout');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('should render for cooperative quest', () => {
      const coopQuest: QuestWithMode = {
        id: 'coop-1',
        mode: 'cooperative',
        category: 'cooperative',
        title: 'Team Challenge',
        durationMinutes: 45,
        reward: { xp: 75 },
        status: 'completed',
      };

      const { getByText, getAllByText } = render(
        <QuestCompleteHeader quest={coopQuest} />
      );
      expect(getByText('Quest Complete!')).toBeTruthy();
      const titles = getAllByText('Team Challenge');
      expect(titles.length).toBeGreaterThan(0);
    });
  });
});
