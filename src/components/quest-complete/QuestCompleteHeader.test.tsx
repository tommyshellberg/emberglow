import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { QuestCompleteHeader } from './QuestCompleteHeader';
import type { QuestWithMode } from './types';

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
    it('should render the quest title', () => {
      const { getByText } = render(
        <QuestCompleteHeader quest={mockQuestWithTitle} onBack={jest.fn()} />
      );
      expect(getByText('The Great Adventure')).toBeTruthy();
    });

    // The celebration heading is dropped entirely per the recomposed art
    // header (quest-flow.jsx:119-132 never renders a "Quest Complete!"
    // string in either context) — replaces the old medallion + heading.
    it('should not render a "Quest Complete!" heading', () => {
      const { queryByText } = render(
        <QuestCompleteHeader quest={mockQuestWithTitle} onBack={jest.fn()} />
      );
      expect(queryByText('Quest Complete!')).toBeNull();
    });

    it('should render the quest artwork as the header background', () => {
      const { getByTestId } = render(
        <QuestCompleteHeader quest={mockQuestWithTitle} onBack={jest.fn()} />
      );
      expect(getByTestId('quest-art-image')).toBeTruthy();
    });

    it('should render the eyebrow with the story quest mode label', () => {
      const { getByText } = render(
        <QuestCompleteHeader
          quest={mockQuestWithTitle}
          onBack={jest.fn()}
          fromJournal
        />
      );
      expect(getByText('STORY QUEST')).toBeTruthy();
    });

    it('should render the eyebrow with the custom quest mode label', () => {
      const { getByText } = render(
        <QuestCompleteHeader
          quest={mockQuestWithoutTitle}
          onBack={jest.fn()}
          fromJournal
        />
      );
      expect(getByText('CUSTOM QUEST')).toBeTruthy();
    });
  });

  describe('fromJournal eyebrow suffix', () => {
    it('appends " · COMPLETE" in the quest-flow context (not from journal)', () => {
      const { getByText } = render(
        <QuestCompleteHeader
          quest={mockQuestWithTitle}
          onBack={jest.fn()}
          fromJournal={false}
        />
      );
      expect(getByText('STORY QUEST · COMPLETE')).toBeTruthy();
    });

    it('omits the suffix in the journal context', () => {
      const { getByText, queryByText } = render(
        <QuestCompleteHeader
          quest={mockQuestWithTitle}
          onBack={jest.fn()}
          fromJournal={true}
        />
      );
      expect(getByText('STORY QUEST')).toBeTruthy();
      expect(queryByText('STORY QUEST · COMPLETE')).toBeNull();
    });
  });

  describe('Back navigation', () => {
    it('renders an accessible "Go back" button', () => {
      const { getByLabelText } = render(
        <QuestCompleteHeader quest={mockQuestWithTitle} onBack={jest.fn()} />
      );
      expect(getByLabelText('Go back')).toBeTruthy();
    });

    it('calls onBack when the back button is pressed', () => {
      const onBack = jest.fn();
      const { getByLabelText } = render(
        <QuestCompleteHeader quest={mockQuestWithTitle} onBack={onBack} />
      );
      fireEvent.press(getByLabelText('Go back'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Animation Props', () => {
    it('accepts disableAnimations and still renders the title', () => {
      const { getByText } = render(
        <QuestCompleteHeader
          quest={mockQuestWithTitle}
          onBack={jest.fn()}
          disableAnimations={true}
        />
      );
      expect(getByText('The Great Adventure')).toBeTruthy();
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

      const { getAllByText } = render(
        <QuestCompleteHeader quest={storyQuest} onBack={jest.fn()} />
      );
      expect(getAllByText('Story Quest').length).toBeGreaterThan(0);
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

      const { getAllByText } = render(
        <QuestCompleteHeader quest={customQuest} onBack={jest.fn()} />
      );
      expect(getAllByText('Morning Workout').length).toBeGreaterThan(0);
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

      const { getAllByText } = render(
        <QuestCompleteHeader quest={coopQuest} onBack={jest.fn()} />
      );
      expect(getAllByText('Team Challenge').length).toBeGreaterThan(0);
    });
  });
});
