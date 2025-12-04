import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { RewardBreakdownCard } from './reward-breakdown-card';

describe('RewardBreakdownCard', () => {
  const mockPerksApplied = [
    {
      id: 'quick_break',
      name: 'Quick Break',
      bonusXP: 9,
      icon: 'zap',
    },
    {
      id: 'endurance_focus',
      name: 'Endurance Focus',
      bonusXP: 14,
      icon: 'dumbbell',
    },
  ];

  it('renders base XP row', () => {
    render(
      <RewardBreakdownCard
        baseXP={45}
        adjustedXP={68}
        perksApplied={mockPerksApplied}
      />
    );

    expect(screen.getByText('Base XP')).toBeTruthy();
    expect(screen.getByText('45')).toBeTruthy();
  });

  it('renders each perk with correct bonus XP', () => {
    render(
      <RewardBreakdownCard
        baseXP={45}
        adjustedXP={68}
        perksApplied={mockPerksApplied}
      />
    );

    expect(screen.getByText('Quick Break')).toBeTruthy();
    expect(screen.getByText('+9')).toBeTruthy();

    expect(screen.getByText('Endurance Focus')).toBeTruthy();
    expect(screen.getByText('+14')).toBeTruthy();
  });

  it('renders total XP row with adjusted value', () => {
    render(
      <RewardBreakdownCard
        baseXP={45}
        adjustedXP={68}
        perksApplied={mockPerksApplied}
      />
    );

    expect(screen.getByText('Total XP')).toBeTruthy();
    expect(screen.getByText('68')).toBeTruthy();
  });

  it('renders header text', () => {
    render(
      <RewardBreakdownCard
        baseXP={45}
        adjustedXP={68}
        perksApplied={mockPerksApplied}
      />
    );

    expect(screen.getByText('Reward Breakdown')).toBeTruthy();
  });

  it('handles single perk correctly', () => {
    const singlePerk = [
      {
        id: 'quick_break',
        name: 'Quick Break',
        bonusXP: 20,
        icon: 'zap',
      },
    ];

    render(
      <RewardBreakdownCard baseXP={45} adjustedXP={65} perksApplied={singlePerk} />
    );

    expect(screen.getByText('Quick Break')).toBeTruthy();
    expect(screen.getByText('+20')).toBeTruthy();
    expect(screen.getByText('65')).toBeTruthy();
  });

  it('handles empty perks array gracefully', () => {
    render(
      <RewardBreakdownCard baseXP={45} adjustedXP={45} perksApplied={[]} />
    );

    expect(screen.getByText('Base XP')).toBeTruthy();
    expect(screen.getByText('Total XP')).toBeTruthy();
    // No perk rows should be rendered
  });

  it('renders perk icons', () => {
    render(
      <RewardBreakdownCard
        baseXP={45}
        adjustedXP={68}
        perksApplied={mockPerksApplied}
      />
    );

    // Icons should be present with testIDs
    expect(screen.getByTestId('perk-icon-quick_break')).toBeTruthy();
    expect(screen.getByTestId('perk-icon-endurance_focus')).toBeTruthy();
  });

  it('has proper accessibility labels', () => {
    render(
      <RewardBreakdownCard
        baseXP={45}
        adjustedXP={68}
        perksApplied={mockPerksApplied}
      />
    );

    expect(screen.getByLabelText('Reward breakdown')).toBeTruthy();
  });
});
