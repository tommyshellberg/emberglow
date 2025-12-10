import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { useSharedValue } from 'react-native-reanimated';

import { PerkBadge } from './perk-badge';

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useSharedValue: jest.fn((initialValue) => ({
      value: initialValue,
    })),
    useAnimatedStyle: jest.fn(() => ({})),
    interpolate: jest.fn((value) => value),
  };
});

// Mock PerkIcon component
jest.mock('@/components/skill-tree/perk-icon', () => ({
  PerkIcon: ({ perkId }: { perkId: string }) => {
    const MockView = require('react-native').View;
    const MockText = require('react-native').Text;
    return (
      <MockView testID={`perk-icon-${perkId}`}>
        <MockText>{perkId}</MockText>
      </MockView>
    );
  },
}));

describe('PerkBadge', () => {
  it('renders the perk name', () => {
    const animationValue = useSharedValue(0);
    render(<PerkBadge perkId="quick_start" animationValue={animationValue} />);

    expect(screen.getByText('Quick Start')).toBeTruthy();
  });

  it('renders the PerkIcon with correct perkId', () => {
    const animationValue = useSharedValue(0);
    render(<PerkBadge perkId="endurance_focus" animationValue={animationValue} />);

    expect(screen.getByTestId('perk-icon-endurance_focus')).toBeTruthy();
  });

  it('handles unknown perk IDs gracefully', () => {
    const animationValue = useSharedValue(0);
    render(<PerkBadge perkId="unknown_perk" animationValue={animationValue} />);

    // Should format the ID as a readable name
    expect(screen.getByText('Unknown Perk')).toBeTruthy();
  });

  it('renders multiple badges with different perks', () => {
    const animationValue1 = useSharedValue(0);
    const animationValue2 = useSharedValue(0);

    const { rerender } = render(
      <PerkBadge perkId="quick_start" animationValue={animationValue1} />
    );

    expect(screen.getByText('Quick Start')).toBeTruthy();

    rerender(<PerkBadge perkId="streak_master" animationValue={animationValue2} />);

    expect(screen.getByText('Streak Master')).toBeTruthy();
  });

  it('accepts animationValue as a prop', () => {
    const animationValue = useSharedValue(0);

    // Should not throw
    expect(() => {
      render(<PerkBadge perkId="quick_start" animationValue={animationValue} />);
    }).not.toThrow();
  });
});
