import React from 'react';

import { render, screen } from '@/lib/test-utils';

import type { DailyStat } from '../lib/daily-stats';
import { WeeklySummary } from './weekly-summary';

const day = (date: string, dayShort: string, minutes: number): DailyStat => ({
  date,
  dayInitial: dayShort[0],
  dayShort,
  minutes,
  isToday: false,
});

describe('WeeklySummary', () => {
  it('shows weekly total and best day', () => {
    render(
      <WeeklySummary
        stats={[day('2026-07-30', 'Thu', 90), day('2026-08-02', 'Sun', 90)]}
      />
    );
    expect(screen.getByText('3h')).toBeOnTheScreen();
    // Ties resolve to the FIRST best day (strict > in getWeeklySummary)
    expect(screen.getByText('Thu · 1h 30m')).toBeOnTheScreen();
  });

  it('shows an em dash for best day when the week is empty', () => {
    render(<WeeklySummary stats={[day('2026-08-02', 'Sun', 0)]} />);
    expect(screen.getByText('0m')).toBeOnTheScreen();
    expect(screen.getByText('—')).toBeOnTheScreen();
  });
});
