import { format } from 'date-fns';
import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { CombinedQuestInput } from './combined-quest-input';

describe('CombinedQuestInput', () => {
  it('derives the FROM/TO preview from a provided startsAt instead of the current time', () => {
    const startsAt = new Date('2026-07-07T10:35:00');
    const expectedEnd = new Date(startsAt.getTime() + 30 * 60_000);

    render(<CombinedQuestInput startsAt={startsAt} initialDuration={30} />);

    expect(screen.getByText(format(startsAt, 'h:mm a'))).toBeTruthy();
    expect(screen.getByTestId('end-time').props.children).toBe(
      format(expectedEnd, 'h:mm a')
    );
  });

  it('updates the TO preview when startsAt changes, not just when duration changes', () => {
    const first = new Date('2026-07-07T10:30:00');
    const second = new Date('2026-07-07T10:35:00');

    const { rerender } = render(
      <CombinedQuestInput startsAt={first} initialDuration={30} />
    );
    rerender(<CombinedQuestInput startsAt={second} initialDuration={30} />);

    const expectedEnd = new Date(second.getTime() + 30 * 60_000);
    expect(screen.getByTestId('end-time').props.children).toBe(
      format(expectedEnd, 'h:mm a')
    );
  });
});
