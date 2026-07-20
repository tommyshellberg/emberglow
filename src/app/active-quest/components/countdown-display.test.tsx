import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { CountdownDisplay, formatCountdown } from './countdown-display';

describe('formatCountdown', () => {
  it('formats minutes and seconds as MM:SS', () => {
    expect(formatCountdown(23 * 60_000 + 41_000)).toBe('23:41');
  });

  it('clamps a zero (or negative) remaining time to 00:00', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(-5000)).toBe('00:00');
  });

  it('spills into H:MM:SS once remaining time crosses an hour', () => {
    expect(formatCountdown(90 * 60_000 + 5_000)).toBe('1:30:05');
  });
});

describe('CountdownDisplay', () => {
  it('renders the countdown over an "Of MM:SS" total sublabel', () => {
    render(
      <CountdownDisplay
        remainingMs={23 * 60_000 + 41_000}
        totalMs={30 * 60_000}
      />
    );

    expect(screen.getByText('23:41')).toBeTruthy();
    expect(screen.getByText('Of 30:00')).toBeTruthy();
  });

  it('renders 00:00 when remainingMs is 0', () => {
    render(<CountdownDisplay remainingMs={0} totalMs={15 * 60_000} />);

    expect(screen.getByText('00:00')).toBeTruthy();
  });
});
