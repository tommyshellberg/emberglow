import * as React from 'react';

import { render, screen } from '@/lib/test-utils';

import { xpBarProgress, XPBar } from './xp-bar';

describe('xpBarProgress', () => {
  it('clamps overflow XP to 100%', () => {
    expect(xpBarProgress(150, 100)).toBe(1);
  });

  it('clamps negative XP to 0%', () => {
    expect(xpBarProgress(-10, 100)).toBe(0);
  });

  it('does not produce NaN when xpNext is 0', () => {
    expect(xpBarProgress(50, 0)).toBe(0);
  });

  it('does not produce NaN when xpNext is negative', () => {
    expect(xpBarProgress(50, -100)).toBe(0);
  });

  it('computes the exact fraction within range', () => {
    expect(xpBarProgress(40, 100)).toBe(0.4);
  });
});

describe('XPBar', () => {
  it('renders the level and XP counts', () => {
    render(<XPBar level={3} xp={40} xpNext={100} />);

    expect(screen.getByText('Level 3')).toBeOnTheScreen();
    expect(screen.getByText('40 / 100 XP')).toBeOnTheScreen();
  });

  it('defaults to level 1 and 0 / 100 XP', () => {
    render(<XPBar />);

    expect(screen.getByText('Level 1')).toBeOnTheScreen();
    expect(screen.getByText('0 / 100 XP')).toBeOnTheScreen();
  });

  it('renders no fill when xp is 0', () => {
    render(<XPBar level={1} xp={0} xpNext={100} />);

    expect(screen.queryByTestId('xp-bar-fill')).not.toBeOnTheScreen();
  });

  it('renders no fill when xpNext is 0 (guards against NaN width)', () => {
    render(<XPBar level={1} xp={50} xpNext={0} />);

    expect(screen.queryByTestId('xp-bar-fill')).not.toBeOnTheScreen();
  });

  it('renders a fill when xp is greater than 0', () => {
    render(<XPBar level={3} xp={40} xpNext={100} />);

    expect(screen.getByTestId('xp-bar-fill')).toBeOnTheScreen();
  });

  it('renders a fill even when xp overflows xpNext', () => {
    render(<XPBar level={5} xp={150} xpNext={100} />);

    expect(screen.getByTestId('xp-bar-fill')).toBeOnTheScreen();
  });
});
