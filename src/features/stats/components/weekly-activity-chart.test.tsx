import React from 'react';

import { render, screen } from '@/lib/test-utils';
import { colors } from '@/theme';

import type { DailyStat } from '../lib/daily-stats';
import { WeeklyActivityChart } from './weekly-activity-chart';

const day = (
  date: string,
  dayInitial: string,
  dayShort: string,
  minutes: number,
  isToday = false
): DailyStat => ({ date, dayInitial, dayShort, minutes, isToday });

// Deliberately non-uniform minutes; today is NOT the best day, so the
// today-highlight and best-day assertions cannot pass by coincidence.
const WEEK: DailyStat[] = [
  day('2026-07-27', 'M', 'Mon', 0),
  day('2026-07-28', 'T', 'Tue', 45),
  day('2026-07-29', 'W', 'Wed', 0),
  day('2026-07-30', 'T', 'Thu', 90),
  day('2026-07-31', 'F', 'Fri', 0),
  day('2026-08-01', 'S', 'Sat', 15),
  day('2026-08-02', 'S', 'Sun', 30, true),
];

const EMPTY_WEEK: DailyStat[] = WEEK.map((d) => ({ ...d, minutes: 0 }));

describe('WeeklyActivityChart', () => {
  it('renders one bar per day', () => {
    render(<WeeklyActivityChart stats={WEEK} variant="full" />);
    expect(screen.getAllByTestId(/^activity-bar-/)).toHaveLength(7);
  });

  it('gives zero-days the neutral stub color, not an accent or red', () => {
    render(<WeeklyActivityChart stats={WEEK} variant="full" />);
    const zeroBar = screen.getByTestId('activity-bar-2026-07-29');
    expect(zeroBar).toHaveStyle({ backgroundColor: colors.border.hairline });
  });

  it('highlights today with the full accent color', () => {
    render(<WeeklyActivityChart stats={WEEK} variant="full" />);
    const todayBar = screen.getByTestId('activity-bar-2026-08-02');
    expect(todayBar).toHaveStyle({ backgroundColor: colors.accent.primary });
  });

  it('summarizes the week in the container accessibility label', () => {
    render(
      <WeeklyActivityChart stats={WEEK} variant="full" testID="chart" />
    );
    expect(screen.getByTestId('chart').props.accessibilityLabel).toBe(
      '3h across 4 days this week, best day Thu'
    );
  });

  it('shows the empty message only when every day is zero', () => {
    render(
      <WeeklyActivityChart
        stats={EMPTY_WEEK}
        variant="full"
        emptyMessage="Complete a quest to light up your week"
      />
    );
    expect(
      screen.getByText('Complete a quest to light up your week')
    ).toBeOnTheScreen();
  });

  it('does NOT show the empty message when the week has activity', () => {
    render(
      <WeeklyActivityChart
        stats={WEEK}
        variant="full"
        emptyMessage="Complete a quest to light up your week"
      />
    );
    expect(
      screen.queryByText('Complete a quest to light up your week')
    ).toBeNull();
  });
});
