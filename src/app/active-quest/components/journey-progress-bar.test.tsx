import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { JourneyProgressBar } from './journey-progress-bar';

jest.mock('lucide-react-native', () => ({
  User: () => null,
  Flag: () => null,
}));
jest.mock('react-native-svg', () => ({
  Svg: () => null,
  Path: () => null,
  Circle: () => null,
  Rect: () => null,
  Line: () => null,
  Polygon: () => null,
  Polyline: () => null,
  G: () => null,
}));

describe('JourneyProgressBar', () => {
  it('renders the travelled time and the live multiplier', () => {
    render(
      <JourneyProgressBar
        fill={0.47}
        travelledMs={21 * 60_000 + 19_000}
        liveMultiplier={1.18}
      />
    );

    expect(screen.getByText(/21:19 travelled/)).toBeTruthy();
    expect(screen.getByText(/1\.18× XP/)).toBeTruthy();
  });

  it('clamps fill above 1 and below 0 without crashing', () => {
    expect(() =>
      render(
        <JourneyProgressBar fill={1.5} travelledMs={0} liveMultiplier={1} />
      )
    ).not.toThrow();
    expect(() =>
      render(
        <JourneyProgressBar fill={-0.2} travelledMs={0} liveMultiplier={1} />
      )
    ).not.toThrow();
  });
});
