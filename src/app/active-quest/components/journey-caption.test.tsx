import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { JourneyCaption } from './journey-caption';

describe('JourneyCaption', () => {
  it('renders travelled time and the live XP multiplier as one caption row', () => {
    render(<JourneyCaption travelledMs={22_000} liveMultiplier={1} />);

    expect(screen.getByText(/00:22 travelled/)).toBeTruthy();
    expect(screen.getByText(/1\.00× XP/)).toBeTruthy();
  });

  it('shows the boosted multiplier to two decimals', () => {
    render(
      <JourneyCaption travelledMs={5 * 60_000 + 3_000} liveMultiplier={1.18} />
    );

    expect(screen.getByText(/05:03 travelled/)).toBeTruthy();
    expect(screen.getByText(/1\.18× XP/)).toBeTruthy();
  });

  it('clamps a negative travelled duration to 00:00', () => {
    render(<JourneyCaption travelledMs={-4_000} liveMultiplier={1} />);

    expect(screen.getByText(/00:00 travelled/)).toBeTruthy();
  });
});
