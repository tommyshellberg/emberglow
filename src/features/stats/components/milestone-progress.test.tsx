import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { MilestoneProgress } from './milestone-progress';

describe('MilestoneProgress', () => {
  it('renders the teaser and no bar at zero', () => {
    render(<MilestoneProgress totalMinutes={0} />);
    expect(
      screen.getByText('Your first milestone: 1 hour reclaimed')
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('milestone-bar')).toBeNull();
  });

  it('renders next-milestone label, bar, and running total', () => {
    render(<MilestoneProgress totalMinutes={1080} />);
    expect(screen.getByText('Next: 24 hours reclaimed')).toBeOnTheScreen();
    expect(screen.getByTestId('milestone-bar')).toBeOnTheScreen();
    expect(screen.getByText('18h reclaimed so far')).toBeOnTheScreen();
    expect(
      screen.queryByText('Your first milestone: 1 hour reclaimed')
    ).toBeNull();
  });

  it('renders the past-ladder state with no next label', () => {
    render(<MilestoneProgress totalMinutes={63000} />);
    expect(screen.getByText('1,050 hours reclaimed')).toBeOnTheScreen();
    expect(screen.queryByText(/^Next:/)).toBeNull();
  });
});
