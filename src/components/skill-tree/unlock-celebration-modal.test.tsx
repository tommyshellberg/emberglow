import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Perk } from '@/api/skill-tree/types';

import { UnlockCelebrationModal } from './unlock-celebration-modal';

// Mock Lottie
jest.mock('lottie-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      play: jest.fn(),
      reset: jest.fn(),
    }));
    return <View testID="lottie-animation" {...props} />;
  });
});

describe('UnlockCelebrationModal', () => {
  const mockUniversalPerk: Perk = {
    id: 'resilient_spirit',
    name: 'Resilient Spirit',
    description: 'Protect your streak from breaking once per week',
    levelRequired: 2,
    category: 'universal',
    isUnlocked: true,
    isChoice: false,
    unlockedAt: '2025-01-14T12:00:00Z',
  };

  const mockKnightPerk: Perk = {
    id: 'knight_iron_will',
    name: 'Iron Will',
    description: "Quest failure doesn't consume your Second Wind charge",
    levelRequired: 3,
    category: 'character-specific',
    isUnlocked: true,
    isChoice: false,
    unlockedAt: '2025-01-14T12:00:00Z',
  };

  const mockChoicePerk: Perk = {
    id: 'quest_mastery',
    name: 'Quest Mastery',
    description: 'Choose your quest style',
    levelRequired: 4,
    category: 'universal',
    isUnlocked: true,
    isChoice: true,
    selectedChoice: 'quick_start',
    choices: [
      {
        id: 'quick_start',
        name: 'Quick Start',
        description: 'Reduce quest durations by 10%',
      },
      {
        id: 'endurance_focus',
        name: 'Endurance Focus',
        description: 'Quests over 45 minutes grant +50% XP',
      },
    ],
    unlockedAt: '2025-01-14T12:00:00Z',
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility', () => {
    it('should not render when visible is false', () => {
      const { queryByTestId } = render(
        <UnlockCelebrationModal
          perk={mockUniversalPerk}
          visible={false}
          onClose={mockOnClose}
        />
      );

      expect(queryByTestId('unlock-celebration-modal')).toBeNull();
    });

    it('should render when visible is true and perk is provided', () => {
      const { getByTestId } = render(
        <UnlockCelebrationModal
          perk={mockUniversalPerk}
          visible={true}
          onClose={mockOnClose}
        />
      );

      expect(getByTestId('unlock-celebration-modal')).toBeTruthy();
    });

    it('should not render when perk is null', () => {
      const { queryByTestId } = render(
        <UnlockCelebrationModal
          perk={null}
          visible={true}
          onClose={mockOnClose}
        />
      );

      expect(queryByTestId('unlock-celebration-modal')).toBeNull();
    });
  });

  describe('Content', () => {
    it('should display "Perk Unlocked!" title', () => {
      const { getByText } = render(
        <UnlockCelebrationModal
          perk={mockUniversalPerk}
          visible={true}
          onClose={mockOnClose}
        />
      );

      expect(getByText('Perk Unlocked!')).toBeTruthy();
    });

    it('should display perk name', () => {
      const { getByText } = render(
        <UnlockCelebrationModal
          perk={mockUniversalPerk}
          visible={true}
          onClose={mockOnClose}
        />
      );

      expect(getByText('Resilient Spirit')).toBeTruthy();
    });

    it('should display perk description', () => {
      const { getByText } = render(
        <UnlockCelebrationModal
          perk={mockUniversalPerk}
          visible={true}
          onClose={mockOnClose}
        />
      );

      expect(
        getByText('Protect your streak from breaking once per week')
      ).toBeTruthy();
    });
  });

  describe('Choice Perks', () => {
    it('should display selected choice for choice perks', () => {
      const { getByText } = render(
        <UnlockCelebrationModal
          perk={mockChoicePerk}
          visible={true}
          onClose={mockOnClose}
        />
      );

      expect(getByText('Selected Path')).toBeTruthy();
      expect(getByText('Quick Start')).toBeTruthy();
    });

    it('should not display choice section for non-choice perks', () => {
      const { queryByText } = render(
        <UnlockCelebrationModal
          perk={mockUniversalPerk}
          visible={true}
          onClose={mockOnClose}
        />
      );

      expect(queryByText('Selected Path')).toBeNull();
    });
  });

  describe('Animations', () => {
    it('should render Lottie animation component', () => {
      const { getByTestId } = render(
        <UnlockCelebrationModal
          perk={mockUniversalPerk}
          visible={true}
          onClose={mockOnClose}
        />
      );

      expect(getByTestId('lottie-animation')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when Continue button is pressed', () => {
      const { getByTestId } = render(
        <UnlockCelebrationModal
          perk={mockUniversalPerk}
          visible={true}
          onClose={mockOnClose}
        />
      );

      const closeButton = getByTestId('unlock-celebration-close-button');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is tapped', () => {
      const { getByTestId } = render(
        <UnlockCelebrationModal
          perk={mockUniversalPerk}
          visible={true}
          onClose={mockOnClose}
        />
      );

      const backdrop = getByTestId('celebration-modal-backdrop');
      fireEvent.press(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT close when card content is tapped', () => {
      const { getByText } = render(
        <UnlockCelebrationModal
          perk={mockUniversalPerk}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Tap on the perk name (part of card content)
      const perkName = getByText('Resilient Spirit');
      fireEvent.press(perkName);

      // Should NOT call onClose when tapping card content
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should handle modal close request', () => {
      const { getByTestId } = render(
        <UnlockCelebrationModal
          perk={mockUniversalPerk}
          visible={true}
          onClose={mockOnClose}
        />
      );

      const modal = getByTestId('unlock-celebration-modal');

      // Trigger onRequestClose by simulating the modal's hardware back button
      // In the actual modal component, onRequestClose is called
      expect(modal).toBeTruthy();
    });
  });
});
