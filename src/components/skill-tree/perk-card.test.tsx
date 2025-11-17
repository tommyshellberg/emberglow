import React from 'react';

import type { Perk } from '@/api/skill-tree/types';
import { fireEvent, render, screen } from '@/lib/test-utils';

import { PerkCard } from './perk-card';

// Mock the PerkIcon component
jest.mock('./perk-icon', () => ({
  PerkIcon: ({ perkId, isUnlocked }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return (
      <View testID={`perk-icon-${perkId}`} style={{ opacity: isUnlocked ? 1 : 0.2 }} />
    );
  },
}));

describe('PerkCard', () => {
  const mockUnlockedPerk: Perk = {
    id: 'resilient_spirit',
    name: 'Resilient Spirit',
    description: 'Protect your streak from breaking once per week',
    levelRequired: 2,
    category: 'universal',
    isUnlocked: true,
    isChoice: false,
    unlockedAt: '2025-01-15T10:30:00Z',
  };

  const mockLockedPerk: Perk = {
    id: 'streak_master',
    name: 'Streak Master',
    description: '7-day streaks grant 2x XP multiplier for 24 hours',
    levelRequired: 6,
    category: 'universal',
    isUnlocked: false,
    isChoice: false,
  };

  const mockAvailablePerk: Perk = {
    id: 'quest_mastery',
    name: 'Quest Mastery',
    description: 'Choose your quest style',
    levelRequired: 4,
    category: 'universal',
    isUnlocked: false,
    isChoice: true,
    choices: [
      {
        id: 'quest_mastery_quick',
        name: 'Quick Start',
        description: 'Reduce quest durations by 10%',
      },
      {
        id: 'quest_mastery_endurance',
        name: 'Endurance Focus',
        description: 'Quests over 45 minutes grant +50% XP',
      },
    ],
  };

  const mockChoicePerkUnlocked: Perk = {
    ...mockAvailablePerk,
    isUnlocked: true,
    selectedChoice: 'quest_mastery_quick',
  };

  describe('Locked state', () => {
    it('renders locked perk with low opacity icon', () => {
      render(<PerkCard perk={mockLockedPerk} currentLevel={3} />);

      expect(screen.getByText('Streak Master')).toBeTruthy();
      expect(screen.getByText(/Level 6 Required/i)).toBeTruthy();
      expect(screen.getByTestId('perk-card-locked')).toBeTruthy();

      // Check that icon is rendered with low opacity for locked perk
      const icon = screen.getByTestId('perk-icon-streak_master');
      expect(icon).toBeTruthy();
      expect(icon.props.style.opacity).toBe(0.2);
    });

    it('shows level requirement for locked perk', () => {
      render(<PerkCard perk={mockLockedPerk} currentLevel={3} />);

      expect(screen.getByText(/Level 6 Required/i)).toBeTruthy();
    });

    it('does not show unlock button for locked perk', () => {
      render(<PerkCard perk={mockLockedPerk} currentLevel={3} />);

      expect(screen.queryByText(/Unlock Now/i)).toBeNull();
    });

    it('displays description on locked perks', () => {
      render(<PerkCard perk={mockLockedPerk} currentLevel={3} />);

      expect(
        screen.getByText('7-day streaks grant 2x XP multiplier for 24 hours')
      ).toBeTruthy();
    });
  });

  describe('Available state (ready to unlock)', () => {
    it('renders available perk with highlighted border and low opacity icon', () => {
      render(<PerkCard perk={mockAvailablePerk} currentLevel={4} />);

      const card = screen.getByTestId('perk-card-available');
      expect(card).toBeTruthy();

      // Check that icon is rendered with low opacity for available (not yet unlocked) perk
      const icon = screen.getByTestId('perk-icon-quest_mastery');
      expect(icon).toBeTruthy();
      expect(icon.props.style.opacity).toBe(0.2);
    });

    it('shows unlock button for available perk', () => {
      const onUnlock = jest.fn();

      // Test with a non-choice perk
      const nonChoicePerk: Perk = {
        ...mockLockedPerk,
        levelRequired: 4,
      };

      render(
        <PerkCard
          perk={nonChoicePerk}
          currentLevel={4}
          onUnlock={onUnlock}
        />
      );

      expect(screen.getByText(/Unlock/i)).toBeTruthy();
    });

    it('calls onUnlock when unlock button is pressed', () => {
      const onUnlock = jest.fn();

      // Test with a non-choice perk
      const nonChoicePerk: Perk = {
        ...mockLockedPerk,
        levelRequired: 4,
      };

      render(
        <PerkCard
          perk={nonChoicePerk}
          currentLevel={4}
          onUnlock={onUnlock}
        />
      );

      const unlockButton = screen.getByTestId(
        `unlock-button-${nonChoicePerk.id}`
      );
      fireEvent.press(unlockButton);

      expect(onUnlock).toHaveBeenCalledWith(nonChoicePerk.id);
    });

    it('shows "Choose Path" for choice node perks', () => {
      const onUnlock = jest.fn();
      render(
        <PerkCard
          perk={mockAvailablePerk}
          currentLevel={4}
          onUnlock={onUnlock}
        />
      );

      expect(screen.getByText(/Choose Path/i)).toBeTruthy();
    });
  });

  describe('Unlocked state', () => {
    it('renders unlocked perk with full opacity icon', () => {
      render(<PerkCard perk={mockUnlockedPerk} currentLevel={5} />);

      expect(screen.getByTestId('perk-card-unlocked')).toBeTruthy();
      expect(screen.queryByTestId('perk-card-locked')).toBeNull();

      // Check that icon is rendered with full opacity for unlocked perk
      const icon = screen.getByTestId('perk-icon-resilient_spirit');
      expect(icon).toBeTruthy();
      expect(icon.props.style.opacity).toBe(1);
    });

    it('shows unlock date for unlocked perk', () => {
      render(<PerkCard perk={mockUnlockedPerk} currentLevel={5} />);

      expect(screen.getByText(/Unlocked/i)).toBeTruthy();
    });

    it('does not show unlock button for unlocked perk', () => {
      render(<PerkCard perk={mockUnlockedPerk} currentLevel={5} />);

      expect(screen.queryByText(/Unlock Now/i)).toBeNull();
    });

    it('shows selected choice for unlocked choice node', () => {
      render(<PerkCard perk={mockChoicePerkUnlocked} currentLevel={5} />);

      expect(screen.getByText('Quick Start')).toBeTruthy();
      expect(screen.getByText(/Selected/i)).toBeTruthy();
    });
  });

  describe('Visual states', () => {
    it('applies correct opacity for locked state', () => {
      render(<PerkCard perk={mockLockedPerk} currentLevel={3} />);

      const card = screen.getByTestId('perk-card-locked');
      expect(card.props.className).toContain('opacity-50');
    });

    it('does not apply reduced opacity for unlocked state', () => {
      render(<PerkCard perk={mockUnlockedPerk} currentLevel={5} />);

      const card = screen.getByTestId('perk-card-unlocked');
      expect(card.props.className).not.toContain('opacity-50');
    });
  });

});
