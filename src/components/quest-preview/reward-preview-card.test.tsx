import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import type { QuestRewardPreviewParticipant } from '@/api/quest-runs/types';

import { RewardPreviewCard } from './reward-preview-card';

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  const actualReanimated = jest.requireActual('react-native-reanimated');

  return {
    ...Reanimated,
    useSharedValue: jest.fn((initialValue) => ({
      value: initialValue,
    })),
    withDelay: jest.fn((delay, animation) => animation),
    withSpring: jest.fn((value, config) => value),
    useAnimatedStyle: jest.fn(() => ({})),
    interpolate: jest.fn((value) => value),
  };
});

// Mock child components
jest.mock('./perk-badge', () => ({
  PerkBadge: ({ perkId, iconOnly }: { perkId: string; iconOnly?: boolean }) => {
    const MockView = require('react-native').View;
    const MockText = require('react-native').Text;
    if (iconOnly) {
      return (
        <MockView testID={`perk-icon-${perkId}`}>
          <MockText>{perkId}</MockText>
        </MockView>
      );
    }
    return (
      <MockView testID={`perk-badge-${perkId}`}>
        <MockText>{perkId}</MockText>
      </MockView>
    );
  },
}));

jest.mock('./xp-breakdown-row', () => ({
  XPBreakdownRow: ({ label, value }: { label: string; value: number }) => {
    const MockView = require('react-native').View;
    const MockText = require('react-native').Text;
    return (
      <MockView testID={`xp-row-${label}`}>
        <MockText>
          {label}: {value}
        </MockText>
      </MockView>
    );
  },
}));

jest.mock('./duration-display', () => ({
  DurationDisplay: ({
    baseDuration,
    adjustedDuration,
  }: {
    baseDuration: number;
    adjustedDuration: number;
  }) => {
    const MockView = require('react-native').View;
    const MockText = require('react-native').Text;
    return (
      <MockView testID="duration-display">
        <MockText>
          {baseDuration} → {adjustedDuration}
        </MockText>
      </MockView>
    );
  },
}));

describe('RewardPreviewCard', () => {
  const mockParticipant: QuestRewardPreviewParticipant = {
    userId: 'user-1',
    baseXP: 90,
    adjustedXP: 135,
    multiplier: 1.5,
    perksApplied: ['quick_start', 'endurance_focus'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders inline XP text', () => {
    render(<RewardPreviewCard participant={mockParticipant} />);

    expect(screen.getByText(/90 XP/)).toBeTruthy();
    expect(screen.getByText(/45 Bonus XP/)).toBeTruthy();
    expect(screen.getByText(/135 XP/)).toBeTruthy();
  });

  it('renders perk badges for each applied perk', () => {
    render(<RewardPreviewCard participant={mockParticipant} />);

    expect(screen.getByTestId('perk-icon-quick_start')).toBeTruthy();
    expect(screen.getByTestId('perk-icon-endurance_focus')).toBeTruthy();
  });

  it('handles empty perks array', () => {
    const participantWithoutPerks: QuestRewardPreviewParticipant = {
      userId: 'user-1',
      baseXP: 90,
      adjustedXP: 135,
      multiplier: 1.5,
      perksApplied: [],
    };

    render(<RewardPreviewCard participant={participantWithoutPerks} />);

    // Should still render XP inline
    expect(screen.getByText(/90 XP/)).toBeTruthy();
    expect(screen.getByText(/135 XP/)).toBeTruthy();

    // No perk icons
    expect(screen.queryByTestId(/perk-icon/)).toBeNull();
  });

  it('calculates bonus XP correctly', () => {
    render(<RewardPreviewCard participant={mockParticipant} />);

    // Bonus XP = 135 - 90 = 45
    expect(screen.getByText(/45 Bonus XP/)).toBeTruthy();
  });

  it('creates shared values for animations', () => {
    render(<RewardPreviewCard participant={mockParticipant} />);

    // Should create one shared value per perk
    expect(useSharedValue).toHaveBeenCalledWith(0);
    expect(useSharedValue).toHaveBeenCalledTimes(
      mockParticipant.perksApplied.length
    );
  });

  it('triggers staggered animations on mount', async () => {
    render(<RewardPreviewCard participant={mockParticipant} />);

    await waitFor(() => {
      // Should use withDelay and withSpring for animations
      expect(withDelay).toHaveBeenCalled();
      expect(withSpring).toHaveBeenCalled();
    });
  });

  it('shows simplified display when no bonus is applied', () => {
    const participantNoBonus: QuestRewardPreviewParticipant = {
      ...mockParticipant,
      baseXP: 90,
      adjustedXP: 90,
      multiplier: 1,
      perksApplied: [],
    };

    render(<RewardPreviewCard participant={participantNoBonus} />);

    // Should show only XP without bonus breakdown when no perks applied
    expect(screen.getByText(/90 XP/)).toBeTruthy();
    expect(screen.queryByText(/Bonus XP/)).toBeNull();
  });
});
