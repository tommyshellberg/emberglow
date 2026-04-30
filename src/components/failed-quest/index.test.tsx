import React from 'react';

import { render, screen } from '@/lib/test-utils';
import type { Quest } from '@/store/types';

import { FailedQuest } from './index';

const baseQuest = {
  id: 'quest-1',
  title: 'The Beginning',
  durationMinutes: 5,
  poiSlug: 'tavern',
  story: 'Your adventure begins...',
  recap: 'You started your journey',
  options: [],
  reward: { xp: 20 },
  status: 'failed' as const,
} as unknown as Quest;

describe('FailedQuest', () => {
  it('renders the headline and quest title', () => {
    render(
      <FailedQuest
        quest={{ ...baseQuest, mode: 'story' } as Quest}
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByText('Quest Failed')).toBeOnTheScreen();
    expect(screen.getByText('The Beginning')).toBeOnTheScreen();
  });

  it('shows the eyebrow with the quest mode label for story quests', () => {
    render(
      <FailedQuest
        quest={{ ...baseQuest, mode: 'story' } as Quest}
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByText('STORY QUEST')).toBeOnTheScreen();
  });

  it('shows the eyebrow with the quest mode label for custom quests', () => {
    render(
      <FailedQuest
        quest={
          {
            ...baseQuest,
            mode: 'custom',
            category: 'fitness',
          } as unknown as Quest
        }
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByText('CUSTOM QUEST')).toBeOnTheScreen();
  });
});
