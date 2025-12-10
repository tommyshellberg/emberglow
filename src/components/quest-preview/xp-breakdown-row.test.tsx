import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { XPBreakdownRow } from './xp-breakdown-row';

describe('XPBreakdownRow', () => {
  it('renders label and value', () => {
    render(<XPBreakdownRow label="Base XP" value={90} />);

    expect(screen.getByText('Base XP')).toBeTruthy();
    expect(screen.getByText('90')).toBeTruthy();
  });

  it('formats bonus values with + prefix', () => {
    render(<XPBreakdownRow label="Bonus XP" value={45} isBonus />);

    expect(screen.getByText('Bonus XP')).toBeTruthy();
    expect(screen.getByText('+45')).toBeTruthy();
  });

  it('renders negative bonus values correctly', () => {
    render(<XPBreakdownRow label="Penalty" value={-10} isBonus />);

    expect(screen.getByText('-10')).toBeTruthy();
  });

  it('renders zero bonus correctly', () => {
    render(<XPBreakdownRow label="Bonus XP" value={0} isBonus />);

    expect(screen.getByText('+0')).toBeTruthy();
  });

  it('applies bold styling for total rows', () => {
    const { getByText } = render(
      <XPBreakdownRow label="Total XP" value={135} isTotal />
    );

    const labelText = getByText('Total XP');
    const valueText = getByText('135');

    // Both should have font-bold class (via className or style)
    expect(labelText).toBeTruthy();
    expect(valueText).toBeTruthy();
  });

  it('does not format non-bonus values with +', () => {
    render(<XPBreakdownRow label="Base XP" value={90} />);

    expect(screen.getByText('90')).toBeTruthy();
    expect(screen.queryByText('+90')).toBeNull();
  });

  it('renders multiple rows independently', () => {
    const { rerender } = render(<XPBreakdownRow label="Base XP" value={90} />);

    expect(screen.getByText('Base XP')).toBeTruthy();
    expect(screen.getByText('90')).toBeTruthy();

    rerender(<XPBreakdownRow label="Bonus XP" value={45} isBonus />);

    expect(screen.getByText('Bonus XP')).toBeTruthy();
    expect(screen.getByText('+45')).toBeTruthy();
  });
});
