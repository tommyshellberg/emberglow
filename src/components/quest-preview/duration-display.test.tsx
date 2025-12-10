import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { DurationDisplay } from './duration-display';

describe('DurationDisplay', () => {
  it('renders base duration only when no adjustment', () => {
    render(<DurationDisplay baseDuration={30} adjustedDuration={30} />);

    expect(screen.getByText('30 min')).toBeTruthy();
    expect(screen.queryByText('→')).toBeNull();
  });

  it('renders adjusted duration with arrow when reduced', () => {
    render(<DurationDisplay baseDuration={30} adjustedDuration={27} />);

    expect(screen.getByText('30 min →')).toBeTruthy();
    expect(screen.getByText('27 min')).toBeTruthy();
  });

  it('calculates and displays percentage reduction', () => {
    render(<DurationDisplay baseDuration={30} adjustedDuration={27} />);

    expect(screen.getByText('(-10%)')).toBeTruthy();
  });

  it('handles different reduction percentages', () => {
    const { rerender } = render(
      <DurationDisplay baseDuration={60} adjustedDuration={48} />
    );

    expect(screen.getByText('(-20%)')).toBeTruthy();

    rerender(<DurationDisplay baseDuration={45} adjustedDuration={42} />);

    // 45 -> 42 is about 6.67% reduction, should round to -7%
    expect(screen.getByText('(-7%)')).toBeTruthy();
  });

  it('handles duration increase (though unlikely)', () => {
    render(<DurationDisplay baseDuration={30} adjustedDuration={33} />);

    expect(screen.getByText('30 min →')).toBeTruthy();
    expect(screen.getByText('33 min')).toBeTruthy();
    expect(screen.getByText('(+10%)')).toBeTruthy();
  });

  it('handles zero percentage change edge case', () => {
    // If durations are slightly different but round to 0%
    render(<DurationDisplay baseDuration={100} adjustedDuration={100} />);

    expect(screen.getByText('100 min')).toBeTruthy();
    expect(screen.queryByText('→')).toBeNull();
  });

  it('renders singular "min" for durations', () => {
    render(<DurationDisplay baseDuration={1} adjustedDuration={1} />);

    expect(screen.getByText('1 min')).toBeTruthy();
  });

  it('shows arrow and percentage for small reductions', () => {
    render(<DurationDisplay baseDuration={30} adjustedDuration={29} />);

    expect(screen.getByText('30 min →')).toBeTruthy();
    expect(screen.getByText('29 min')).toBeTruthy();
    expect(screen.getByText('(-3%)')).toBeTruthy();
  });
});
