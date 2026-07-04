import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { CompactRewardBreakdown } from './compact-reward-breakdown';

// Mock PerkIcon to avoid SVG/image loading issues in tests
jest.mock('@/components/skill-tree/perk-icon', () => ({
  PerkIcon: ({ perkId }: { perkId: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={`mock-perk-icon-${perkId}`}>
        <Text>{perkId}</Text>
      </View>
    );
  },
}));

describe('CompactRewardBreakdown', () => {
  const mockPerksApplied = [
    { id: 'quick_break', name: 'Quick Break', bonusXP: 9, icon: 'zap' },
    {
      id: 'endurance_focus',
      name: 'Endurance Focus',
      bonusXP: 14,
      icon: 'dumbbell',
    },
  ];

  it('renders header text', () => {
    render(
      <CompactRewardBreakdown
        baseXP={45}
        adjustedXP={68}
        perksApplied={mockPerksApplied}
      />
    );

    expect(screen.getByText('Active Perks')).toBeTruthy();
  });

  it('renders bonus XP (adjustedXP - baseXP)', () => {
    render(
      <CompactRewardBreakdown
        baseXP={45}
        adjustedXP={68}
        perksApplied={mockPerksApplied}
      />
    );

    // 68 - 45 = 23 bonus XP
    expect(screen.getByText('+23 XP')).toBeTruthy();
  });

  it('renders perk badges for each perk', () => {
    render(
      <CompactRewardBreakdown
        baseXP={45}
        adjustedXP={68}
        perksApplied={mockPerksApplied}
      />
    );

    expect(screen.getByTestId('perk-badge-quick_break')).toBeTruthy();
    expect(screen.getByTestId('perk-badge-endurance_focus')).toBeTruthy();
  });

  it('shows each perk name as visible text, so the perk is identifiable from the icon alone', () => {
    render(
      <CompactRewardBreakdown
        baseXP={45}
        adjustedXP={68}
        perksApplied={mockPerksApplied}
      />
    );

    expect(screen.getByText('Quick Break')).toBeTruthy();
    expect(screen.getByText('Endurance Focus')).toBeTruthy();
  });

  it('handles empty perks array', () => {
    render(
      <CompactRewardBreakdown baseXP={45} adjustedXP={45} perksApplied={[]} />
    );

    expect(screen.getByText('Active Perks')).toBeTruthy();
    expect(screen.getByText('+0 XP')).toBeTruthy();
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
    expect(screen.getByLabelText('Quick Break: +9 XP')).toBeTruthy();
    expect(screen.getByLabelText('Endurance Focus: +14 XP')).toBeTruthy();
  });

  describe('lock bonus', () => {
    it('renders a lock bonus line with the server-provided value when positive', () => {
      render(
        <CompactRewardBreakdown
          baseXP={45}
          adjustedXP={45}
          perksApplied={[]}
          lockBonus={12}
        />
      );

      expect(screen.getByText('Lock bonus')).toBeTruthy();
      expect(screen.getByText('+12')).toBeTruthy();
    });

    it('renders the lock bonus line alongside perk badges when both are present', () => {
      render(
        <CompactRewardBreakdown
          baseXP={45}
          adjustedXP={68}
          perksApplied={mockPerksApplied}
          lockBonus={5}
        />
      );

      expect(screen.getByText('Lock bonus')).toBeTruthy();
      expect(screen.getByText('+5')).toBeTruthy();
      expect(screen.getByTestId('perk-badge-quick_break')).toBeTruthy();
    });

    it('renders no lock bonus line when lockBonus is 0', () => {
      render(
        <CompactRewardBreakdown
          baseXP={45}
          adjustedXP={68}
          perksApplied={mockPerksApplied}
          lockBonus={0}
        />
      );

      expect(screen.queryByText(/lock bonus/i)).toBeNull();
    });

    it('renders no lock bonus line when lockBonus is undefined', () => {
      render(
        <CompactRewardBreakdown
          baseXP={45}
          adjustedXP={68}
          perksApplied={mockPerksApplied}
        />
      );

      expect(screen.queryByText(/lock bonus/i)).toBeNull();
    });
  });
});
