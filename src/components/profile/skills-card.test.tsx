import React from 'react';

import type { Character } from '@/store/types';
import { fireEvent, render, screen } from '@/lib/test-utils';
import { useSkillTreeStore } from '@/store/skill-tree-store';

import { SkillsCard } from './skills-card';

// Mock the skill tree store
jest.mock('@/store/skill-tree-store', () => ({
  useSkillTreeStore: jest.fn(),
}));

const mockUseSkillTreeStore = useSkillTreeStore as jest.MockedFunction<
  typeof useSkillTreeStore
>;

describe('SkillsCard', () => {
  const mockCharacter: Character = {
    type: 'knight',
    name: 'Test Knight',
    level: 5,
    currentXP: 506,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('With available skill points', () => {
    beforeEach(() => {
      // Mock skill tree with 2 unlocked perks, level 5 = 4 available perks total
      // So 2 available points remaining
      const getUnlockedPerks = jest.fn(() => [
        {
          id: 'resilient_spirit',
          name: 'Resilient Spirit',
          description: 'Protect your streak',
          levelRequired: 2,
          category: 'universal',
          isUnlocked: true,
          isChoice: false,
          unlockedAt: '2025-01-15T10:30:00Z',
        },
        {
          id: 'quest_mastery',
          name: 'Quest Mastery',
          description: 'Quest bonuses',
          levelRequired: 4,
          category: 'universal',
          isUnlocked: true,
          isChoice: true,
          selectedChoice: 'quest_mastery_quick',
        },
      ]);

      const getAvailablePerksToUnlock = jest.fn(() => [
        {
          id: 'knight_iron_will',
          name: 'Iron Will',
          description: 'Locked perk',
          levelRequired: 3,
          category: 'character-specific',
          isUnlocked: false,
          isChoice: false,
        },
      ]);

      mockUseSkillTreeStore.mockReturnValue({
        skillTreeData: {
          currentLevel: 5,
          characterType: 'knight',
          unlockedNodes: ['resilient_spirit', 'quest_mastery_quick'],
          availablePerks: [
            {
              id: 'resilient_spirit',
              name: 'Resilient Spirit',
              description: 'Protect your streak',
              levelRequired: 2,
              category: 'universal',
              isUnlocked: true,
              isChoice: false,
              unlockedAt: '2025-01-15T10:30:00Z',
            },
            {
              id: 'quest_mastery',
              name: 'Quest Mastery',
              description: 'Quest bonuses',
              levelRequired: 4,
              category: 'universal',
              isUnlocked: true,
              isChoice: true,
              selectedChoice: 'quest_mastery_quick',
            },
            {
              id: 'knight_iron_will',
              name: 'Iron Will',
              description: 'Locked perk',
              levelRequired: 3,
              category: 'character-specific',
              isUnlocked: false,
              isChoice: false,
            },
          ],
          canRespec: false,
          respecsUsed: 0,
          lastRespecAt: null,
        },
        getUnlockedPerks,
        getAvailablePerksToUnlock,
        setSkillTreeData: jest.fn(),
        clearSkillTreeData: jest.fn(),
        hasUnlockedPerk: jest.fn(),
        getPerkById: jest.fn(),
        getLockedPerks: jest.fn(),
      } as any);
    });

    it('renders card title', () => {
      render(<SkillsCard character={mockCharacter} onPress={jest.fn()} />);

      expect(screen.getByText('Skills & Perks')).toBeTruthy();
    });

    it('shows available skill points prominently', () => {
      render(<SkillsCard character={mockCharacter} onPress={jest.fn()} />);

      expect(screen.getByText(/1 Point Available/i)).toBeTruthy();
    });

    it('shows CTA button to spend points', () => {
      render(<SkillsCard character={mockCharacter} onPress={jest.fn()} />);

      expect(screen.getByText(/Spend Points/i)).toBeTruthy();
    });

    it('calls onPress when CTA button is pressed', () => {
      const onPress = jest.fn();
      render(<SkillsCard character={mockCharacter} onPress={onPress} />);

      const button = screen.getByText(/Spend Points/i);
      fireEvent.press(button);

      expect(onPress).toHaveBeenCalled();
    });

    it('shows preview of unlocked perks', () => {
      render(<SkillsCard character={mockCharacter} onPress={jest.fn()} />);

      expect(screen.getByText('Resilient Spirit')).toBeTruthy();
      expect(screen.getByText('Quest Mastery')).toBeTruthy();
    });

    it('limits perk preview to 3 most recent', () => {
      // Override mock with 4 unlocked perks
      const getUnlockedPerks = jest.fn(() => [
        {
          id: 'perk1',
          name: 'Perk 1',
          description: 'First perk',
          levelRequired: 2,
          category: 'universal',
          isUnlocked: true,
          isChoice: false,
          unlockedAt: '2025-01-15T08:00:00Z',
        },
        {
          id: 'perk2',
          name: 'Perk 2',
          description: 'Second perk',
          levelRequired: 3,
          category: 'universal',
          isUnlocked: true,
          isChoice: false,
          unlockedAt: '2025-01-15T09:00:00Z',
        },
        {
          id: 'perk3',
          name: 'Perk 3',
          description: 'Third perk',
          levelRequired: 4,
          category: 'universal',
          isUnlocked: true,
          isChoice: false,
          unlockedAt: '2025-01-15T10:00:00Z',
        },
        {
          id: 'perk4',
          name: 'Perk 4',
          description: 'Fourth perk (most recent)',
          levelRequired: 5,
          category: 'universal',
          isUnlocked: true,
          isChoice: false,
          unlockedAt: '2025-01-15T11:00:00Z',
        },
      ]);

      const getAvailablePerksToUnlock = jest.fn(() => []);

      mockUseSkillTreeStore.mockReturnValue({
        skillTreeData: {
          currentLevel: 10,
          characterType: 'knight',
          unlockedNodes: ['perk1', 'perk2', 'perk3', 'perk4'],
          availablePerks: [],
          canRespec: false,
          respecsUsed: 0,
          lastRespecAt: null,
        },
        getUnlockedPerks,
        getAvailablePerksToUnlock,
        setSkillTreeData: jest.fn(),
        clearSkillTreeData: jest.fn(),
        hasUnlockedPerk: jest.fn(),
        getPerkById: jest.fn(),
        getLockedPerks: jest.fn(),
      } as any);

      render(<SkillsCard character={mockCharacter} onPress={jest.fn()} />);

      // Should show only 3 most recent
      expect(screen.getByText('Perk 4')).toBeTruthy();
      expect(screen.getByText('Perk 3')).toBeTruthy();
      expect(screen.getByText('Perk 2')).toBeTruthy();
      expect(screen.queryByText('Perk 1')).toBeNull();
    });
  });

  describe('With no available skill points', () => {
    beforeEach(() => {
      // Mock skill tree with all perks for level 3 unlocked (3 total: levels 2, 3, 4 are unavailable at level 3)
      const getUnlockedPerks = jest.fn(() => [
        {
          id: 'resilient_spirit',
          name: 'Resilient Spirit',
          description: 'Protect your streak',
          levelRequired: 2,
          category: 'universal',
          isUnlocked: true,
          isChoice: false,
          unlockedAt: '2025-01-15T10:30:00Z',
        },
      ]);

      const getAvailablePerksToUnlock = jest.fn(() => []);

      mockUseSkillTreeStore.mockReturnValue({
        skillTreeData: {
          currentLevel: 3,
          characterType: 'knight',
          unlockedNodes: ['resilient_spirit'],
          availablePerks: [
            {
              id: 'resilient_spirit',
              name: 'Resilient Spirit',
              description: 'Protect your streak',
              levelRequired: 2,
              category: 'universal',
              isUnlocked: true,
              isChoice: false,
              unlockedAt: '2025-01-15T10:30:00Z',
            },
          ],
          canRespec: false,
          respecsUsed: 0,
          lastRespecAt: null,
        },
        getUnlockedPerks,
        getAvailablePerksToUnlock,
        setSkillTreeData: jest.fn(),
        clearSkillTreeData: jest.fn(),
        hasUnlockedPerk: jest.fn(),
        getPerkById: jest.fn(),
        getLockedPerks: jest.fn(),
      } as any);
    });

    it('shows "View Skills" button instead of "Spend Points"', () => {
      render(<SkillsCard character={mockCharacter} onPress={jest.fn()} />);

      expect(screen.getByText(/View Skills/i)).toBeTruthy();
      expect(screen.queryByText(/Spend Points/i)).toBeNull();
    });

    it('does not highlight available points', () => {
      render(<SkillsCard character={mockCharacter} onPress={jest.fn()} />);

      expect(screen.queryByText(/Point Available/i)).toBeNull();
    });
  });

  describe('With no unlocked perks', () => {
    beforeEach(() => {
      const getUnlockedPerks = jest.fn(() => []);
      const getAvailablePerksToUnlock = jest.fn(() => [
        {
          id: 'resilient_spirit',
          name: 'Resilient Spirit',
          description: 'Protect your streak',
          levelRequired: 2,
          category: 'universal',
          isUnlocked: false,
          isChoice: false,
        },
      ]);

      mockUseSkillTreeStore.mockReturnValue({
        skillTreeData: {
          currentLevel: 2,
          characterType: 'knight',
          unlockedNodes: [],
          availablePerks: [],
          canRespec: false,
          respecsUsed: 0,
          lastRespecAt: null,
        },
        getUnlockedPerks,
        getAvailablePerksToUnlock,
        setSkillTreeData: jest.fn(),
        clearSkillTreeData: jest.fn(),
        hasUnlockedPerk: jest.fn(),
        getPerkById: jest.fn(),
        getLockedPerks: jest.fn(),
      } as any);
    });

    it('shows placeholder message when no perks unlocked', () => {
      render(<SkillsCard character={mockCharacter} onPress={jest.fn()} />);

      expect(screen.getByText(/Unlock your first perk/i)).toBeTruthy();
    });

    it('still shows available points', () => {
      render(<SkillsCard character={mockCharacter} onPress={jest.fn()} />);

      expect(screen.getByText(/1 Point Available/i)).toBeTruthy();
    });
  });
});
