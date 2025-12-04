import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { CompactRewardBreakdown } from './compact-reward-breakdown';

describe('CompactRewardBreakdown', () => {
  const mockPerksApplied = [
    { id: 'quick_break', name: 'Quick Break', bonusXP: 9, icon: 'zap' },
    { id: 'endurance_focus', name: 'Endurance Focus', bonusXP: 14, icon: 'dumbbell' },
  ];

  it('renders header text', () => {
    render(
      <CompactRewardBreakdown
        baseXP={45}
        adjustedXP={68}
        perksApplied={mockPerksApplied}
      />
    );

    expect(screen.getByText('Perks used on this quest')).toBeTruthy();
  });

  it('renders total XP', () => {
    render(
      <CompactRewardBreakdown
        baseXP={45}
        adjustedXP={68}
        perksApplied={mockPerksApplied}
      />
    );

    expect(screen.getByText('Total XP')).toBeTruthy();
    expect(screen.getByText('68')).toBeTruthy();
  });

  it('renders perk badges with bonus XP', () => {
    render(
      <CompactRewardBreakdown
        baseXP={45}
        adjustedXP={68}
        perksApplied={mockPerksApplied}
      />
    );

    expect(screen.getByTestId('perk-badge-quick_break')).toBeTruthy();
    expect(screen.getByTestId('perk-badge-endurance_focus')).toBeTruthy();
    expect(screen.getByText('+9')).toBeTruthy();
    expect(screen.getByText('+14')).toBeTruthy();
  });

  it('handles empty perks array', () => {
    render(
      <CompactRewardBreakdown baseXP={45} adjustedXP={45} perksApplied={[]} />
    );

    expect(screen.getByText('Perks used on this quest')).toBeTruthy();
    expect(screen.getByText('Total XP')).toBeTruthy();
    expect(screen.queryByTestId('perk-badge-quick_break')).toBeNull();
  });

  it('has proper accessibility labels', () => {
    render(
      <CompactRewardBreakdown
        baseXP={45}
        adjustedXP={68}
        perksApplied={mockPerksApplied}
      />
    );

    expect(screen.getByLabelText('Reward breakdown')).toBeTruthy();
    expect(screen.getByLabelText('Quick Break: +9 XP. Tap to flip')).toBeTruthy();
    expect(screen.getByLabelText('Endurance Focus: +14 XP. Tap to flip')).toBeTruthy();
  });
});
