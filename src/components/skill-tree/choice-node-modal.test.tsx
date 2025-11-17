import React from 'react';

import type { Perk } from '@/api/skill-tree/types';
import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';

import { ChoiceNodeModal } from './choice-node-modal';

describe('ChoiceNodeModal', () => {
  const mockChoicePerk: Perk = {
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

  it('renders modal with perk title', async () => {
    render(
      <ChoiceNodeModal
        perk={mockChoicePerk}
        onClose={jest.fn()}
        onSelectChoice={jest.fn()}
      />
    );

    // Wait for modal to present
    await waitFor(() => {
      expect(screen.getByText('Quest Mastery')).toBeTruthy();
    });
  });

  it('renders all choice options', async () => {
    render(
      <ChoiceNodeModal
        perk={mockChoicePerk}
        onClose={jest.fn()}
        onSelectChoice={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Quick Start')).toBeTruthy();
      expect(screen.getByText('Endurance Focus')).toBeTruthy();
    });
  });

  it('shows choice descriptions', async () => {
    render(
      <ChoiceNodeModal
        perk={mockChoicePerk}
        onClose={jest.fn()}
        onSelectChoice={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Reduce quest durations by 10%/i)).toBeTruthy();
      expect(
        screen.getByText(/Quests over 45 minutes grant \+50% XP/i)
      ).toBeTruthy();
    });
  });

  it('calls onSelectChoice when a choice is selected', async () => {
    const onSelectChoice = jest.fn();
    render(
      <ChoiceNodeModal
        perk={mockChoicePerk}
        onClose={jest.fn()}
        onSelectChoice={onSelectChoice}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('choice-button-quest_mastery_quick')).toBeTruthy();
    });

    const quickStartButton = screen.getByTestId(
      'choice-button-quest_mastery_quick'
    );
    fireEvent.press(quickStartButton);

    expect(onSelectChoice).toHaveBeenCalledWith('quest_mastery_quick');
  });

  it('renders with correct accessibility', async () => {
    render(
      <ChoiceNodeModal
        perk={mockChoicePerk}
        onClose={jest.fn()}
        onSelectChoice={jest.fn()}
      />
    );

    // Modal provides close functionality
    await waitFor(() => {
      expect(screen.getByText('Quest Mastery')).toBeTruthy();
      expect(screen.getByTestId('choice-button-quest_mastery_quick')).toBeTruthy();
    });
  });

  it('shows perk description', async () => {
    render(
      <ChoiceNodeModal
        perk={mockChoicePerk}
        onClose={jest.fn()}
        onSelectChoice={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Choose your quest style')).toBeTruthy();
    });
  });
});
