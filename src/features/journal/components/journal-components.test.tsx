import React from 'react';

import { QuestListItem } from '@/features/journal/components/journal-components';
import type { TransformedQuest } from '@/features/journal/types/journal-types';
import { render, screen } from '@/lib/test-utils';

const holdoutQuest: TransformedQuest = {
  id: 'holdout-1',
  questRunId: 'run-1',
  title: 'Hold Out',
  mode: 'holdout',
  durationMinutes: 47,
  reward: { xp: 141 },
  status: 'completed',
  startTime: 1725000000000,
  stopTime: 1725002820000,
  category: 'other',
};

describe('QuestListItem', () => {
  it('renders a completed holdout quest without crashing', () => {
    // Regression: MODE_ICON/MODE_LABEL lacked a holdout entry, so the first
    // holdout run in the journal crashed the screen ("Cannot read property
    // 'displayName' of undefined").
    render(<QuestListItem quest={holdoutQuest} />);

    expect(screen.getByTestId('journal-entry')).toBeOnTheScreen();
    // Twice: once as the quest title, once as the subtitle's mode label.
    expect(screen.getAllByText(/Hold Out/)).toHaveLength(2);
    expect(screen.getByText(/\+141 XP/)).toBeOnTheScreen();
  });
});
