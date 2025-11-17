import React from 'react';

import type { SkillTreeResponse } from '@/api/skill-tree/types';
import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';

import { SkillTreeScreen } from './skill-tree-screen';

// Mock the UnlockCelebrationModal to avoid interference
jest.mock('./unlock-celebration-modal', () => ({
  UnlockCelebrationModal: () => null,
}));

// Mock the hooks
jest.mock('@/api/skill-tree', () => ({
  useSkillTree: jest.fn(),
  useUnlockPerk: jest.fn(),
  useRespecSkillTree: jest.fn(),
}));

import {
  useRespecSkillTree,
  useSkillTree,
  useUnlockPerk,
} from '@/api/skill-tree';

const mockUseSkillTree = useSkillTree as jest.MockedFunction<
  typeof useSkillTree
>;
const mockUseUnlockPerk = useUnlockPerk as jest.MockedFunction<
  typeof useUnlockPerk
>;
const mockUseRespecSkillTree = useRespecSkillTree as jest.MockedFunction<
  typeof useRespecSkillTree
>;

describe('SkillTreeScreen', () => {
  const mockSkillTreeData: SkillTreeResponse = {
    currentLevel: 5,
    characterType: 'knight',
    unlockedNodes: ['resilient_spirit'],
    availablePerks: [
      {
        id: 'resilient_spirit',
        name: 'Resilient Spirit',
        description: 'Protect your streak from breaking once per week',
        levelRequired: 2,
        category: 'universal',
        isUnlocked: true,
        isChoice: false,
        unlockedAt: '2025-01-15T10:30:00Z',
      },
      {
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
      },
      {
        id: 'streak_master',
        name: 'Streak Master',
        description: '7-day streaks grant 2x XP multiplier for 24 hours',
        levelRequired: 6,
        category: 'universal',
        isUnlocked: false,
        isChoice: false,
      },
      {
        id: 'knight_iron_will',
        name: 'Iron Will',
        description: 'Quest failure does not consume Second Wind charge',
        levelRequired: 3,
        category: 'character-specific',
        isUnlocked: false,
        isChoice: false,
      },
    ],
    canRespec: false,
    respecsUsed: 0,
    lastRespecAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseUnlockPerk.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as any);

    mockUseRespecSkillTree.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as any);
  });

  describe('Loading state', () => {
    it('shows loading indicator when fetching skill tree', () => {
      mockUseSkillTree.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      } as any);

      render(<SkillTreeScreen />);

      expect(screen.getByTestId('skill-tree-loading')).toBeTruthy();
    });
  });

  describe('Error state', () => {
    it('shows error message when skill tree fetch fails', () => {
      mockUseSkillTree.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Failed to fetch'),
      } as any);

      render(<SkillTreeScreen />);

      expect(screen.getByText(/error/i)).toBeTruthy();
    });
  });

  describe('Success state', () => {
    beforeEach(() => {
      mockUseSkillTree.mockReturnValue({
        data: mockSkillTreeData,
        isLoading: false,
        isError: false,
        error: null,
      } as any);
    });

    it('renders character info and level', () => {
      render(<SkillTreeScreen />);

      expect(screen.getByText(/Level 5/i)).toBeTruthy();
      expect(screen.getAllByText(/Knight/i).length).toBeGreaterThan(0);
    });

    it('renders all perks', () => {
      render(<SkillTreeScreen />);

      expect(screen.getByText('Resilient Spirit')).toBeTruthy();
      expect(screen.getByText('Quest Mastery')).toBeTruthy();
      expect(screen.getByText('Streak Master')).toBeTruthy();
      expect(screen.getByText('Iron Will')).toBeTruthy();
    });

    it('shows count of unlocked and total perks', () => {
      render(<SkillTreeScreen />);

      expect(screen.getByText(/1.*unlocked/i)).toBeTruthy();
    });

    // TODO: Fix this test - Animated.View components may not be properly unmounted in tests
    it.skip('filters to show only unlocked perks', async () => {
      render(<SkillTreeScreen />);

      const unlockedFilter = screen.getAllByText(/Unlocked/i)[0];
      fireEvent.press(unlockedFilter);

      await waitFor(() => {
        expect(screen.getByText('Resilient Spirit')).toBeTruthy();
        // Quest Mastery should not be visible (it's not unlocked)
        const questMasteryElements = screen.queryAllByText('Quest Mastery');
        expect(questMasteryElements).toHaveLength(0);
      });
    });

    // TODO: Fix this test - Animated.View components may not be properly unmounted in tests
    it.skip('filters to show only locked perks', async () => {
      render(<SkillTreeScreen />);

      const lockedFilter = screen.getAllByText(/Locked/i)[0];
      fireEvent.press(lockedFilter);

      await waitFor(() => {
        // Resilient Spirit should not be visible (it's unlocked, not locked)
        const resilientSpiritElements = screen.queryAllByText('Resilient Spirit');
        expect(resilientSpiritElements).toHaveLength(0);
        expect(screen.getByText('Streak Master')).toBeTruthy();
      });
    });

    it('filters to show only available perks (ready to unlock)', async () => {
      render(<SkillTreeScreen />);

      const availableFilter = screen.getByText(/Available/i);
      fireEvent.press(availableFilter);

      await waitFor(() => {
        // Quest Mastery and Iron Will are available (level 4 and 3, current level is 5)
        expect(screen.getByText('Quest Mastery')).toBeTruthy();
        expect(screen.getByText('Iron Will')).toBeTruthy();
        // Resilient Spirit is unlocked, should not show
        expect(screen.queryByText('Resilient Spirit')).toBeNull();
        // Streak Master is locked (level 6 > 5), should not show
        expect(screen.queryByText('Streak Master')).toBeNull();
      });
    });
  });

  describe('Perk unlock flow', () => {
    beforeEach(() => {
      mockUseSkillTree.mockReturnValue({
        data: mockSkillTreeData,
        isLoading: false,
        isError: false,
        error: null,
      } as any);
    });

    it('opens choice modal when unlocking choice perk', async () => {
      render(<SkillTreeScreen />);

      // Find and press the "Choose Path" button for Quest Mastery
      const chooseButton = screen.getByTestId('unlock-button-quest_mastery');
      fireEvent.press(chooseButton);

      await waitFor(() => {
        expect(screen.getByText('Quick Start')).toBeTruthy();
        expect(screen.getByText('Endurance Focus')).toBeTruthy();
      });
    });

    it('calls unlock mutation for non-choice perk', async () => {
      const mockMutate = jest.fn();
      mockUseUnlockPerk.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      render(<SkillTreeScreen />);

      // Find and press unlock button for Iron Will (non-choice perk)
      const unlockButton = screen.getByTestId('unlock-button-knight_iron_will');
      fireEvent.press(unlockButton);

      expect(mockMutate).toHaveBeenCalledWith(
        {
          nodeId: 'knight_iron_will',
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
        })
      );
    });
  });

  describe('Scrolling behavior', () => {
    beforeEach(() => {
      mockUseSkillTree.mockReturnValue({
        data: mockSkillTreeData,
        isLoading: false,
        isError: false,
        error: null,
      } as any);
    });

    it('renders in a scrollable container', () => {
      render(<SkillTreeScreen />);

      expect(screen.getByTestId('skill-tree-scroll-view')).toBeTruthy();
    });
  });

  describe('Perk sorting', () => {
    beforeEach(() => {
      mockUseSkillTree.mockReturnValue({
        data: mockSkillTreeData,
        isLoading: false,
        isError: false,
        error: null,
      } as any);
    });

    it('sorts perks with available ones first when filter is "all"', () => {
      render(<SkillTreeScreen />);

      // Get all perk cards by their text content
      const perkNames = screen
        .getAllByText(/Quest Mastery|Iron Will|Resilient Spirit|Streak Master/)
        .map((node) => node.props.children);

      // Expected order: available perks first (sorted by level), then unlocked, then locked
      // Available: Iron Will (level 3), Quest Mastery (level 4)
      // Unlocked: Resilient Spirit (level 2)
      // Locked: Streak Master (level 6 > current level 5)
      expect(perkNames[0]).toBe('Iron Will'); // available, level 3
      expect(perkNames[1]).toBe('Quest Mastery'); // available, level 4
      expect(perkNames[2]).toBe('Resilient Spirit'); // unlocked
      expect(perkNames[3]).toBe('Streak Master'); // locked
    });
  });

  describe('Respec button', () => {
    it('does not show respec button when canRespec is false', () => {
      mockUseSkillTree.mockReturnValue({
        data: mockSkillTreeData,
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      render(<SkillTreeScreen />);

      expect(screen.queryByText(/Respec/i)).toBeNull();
    });

    it('shows respec button when canRespec is true', () => {
      mockUseSkillTree.mockReturnValue({
        data: {
          ...mockSkillTreeData,
          canRespec: true,
        },
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      render(<SkillTreeScreen />);

      expect(screen.getByText(/Reset Skills/i)).toBeTruthy();
    });
  });
});
