import type { Perk, SkillTreeResponse } from '@/api/skill-tree/types';

import { useSkillTreeStore } from './skill-tree-store';

describe('skill-tree-store', () => {
  const mockSkillTreeData: SkillTreeResponse = {
    currentLevel: 5,
    characterType: 'knight',
    unlockedNodes: ['resilient_spirit', 'quest_mastery_quick'],
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
        isUnlocked: true,
        isChoice: true,
        selectedChoice: 'quest_mastery_quick',
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
    ],
    canRespec: false,
    respecsUsed: 0,
    lastRespecAt: null,
  };

  beforeEach(() => {
    // Reset store before each test
    useSkillTreeStore.setState({
      skillTreeData: null,
    });
  });

  describe('setSkillTreeData', () => {
    it('sets skill tree data', () => {
      const { setSkillTreeData } = useSkillTreeStore.getState();

      setSkillTreeData(mockSkillTreeData);

      const state = useSkillTreeStore.getState();
      expect(state.skillTreeData).toEqual(mockSkillTreeData);
    });

    it('overwrites existing skill tree data', () => {
      const { setSkillTreeData } = useSkillTreeStore.getState();

      setSkillTreeData(mockSkillTreeData);

      const newData: SkillTreeResponse = {
        ...mockSkillTreeData,
        currentLevel: 10,
        unlockedNodes: ['perk1', 'perk2', 'perk3'],
      };

      setSkillTreeData(newData);

      const state = useSkillTreeStore.getState();
      expect(state.skillTreeData).toEqual(newData);
      expect(state.skillTreeData?.currentLevel).toBe(10);
    });
  });

  describe('clearSkillTreeData', () => {
    it('clears skill tree data', () => {
      const { setSkillTreeData, clearSkillTreeData } =
        useSkillTreeStore.getState();

      setSkillTreeData(mockSkillTreeData);
      expect(useSkillTreeStore.getState().skillTreeData).not.toBeNull();

      clearSkillTreeData();

      expect(useSkillTreeStore.getState().skillTreeData).toBeNull();
    });
  });

  describe('getUnlockedPerks', () => {
    it('returns empty array when no skill tree data', () => {
      const { getUnlockedPerks } = useSkillTreeStore.getState();

      const unlockedPerks = getUnlockedPerks();

      expect(unlockedPerks).toEqual([]);
    });

    it('returns only unlocked perks', () => {
      const { setSkillTreeData, getUnlockedPerks } =
        useSkillTreeStore.getState();

      setSkillTreeData(mockSkillTreeData);

      const unlockedPerks = getUnlockedPerks();

      expect(unlockedPerks).toHaveLength(2);
      expect(unlockedPerks.map((p) => p.id)).toEqual([
        'resilient_spirit',
        'quest_mastery',
      ]);
      expect(unlockedPerks.every((p) => p.isUnlocked)).toBe(true);
    });
  });

  describe('getLockedPerks', () => {
    it('returns empty array when no skill tree data', () => {
      const { getLockedPerks } = useSkillTreeStore.getState();

      const lockedPerks = getLockedPerks();

      expect(lockedPerks).toEqual([]);
    });

    it('returns only locked perks', () => {
      const { setSkillTreeData, getLockedPerks } = useSkillTreeStore.getState();

      setSkillTreeData(mockSkillTreeData);

      const lockedPerks = getLockedPerks();

      expect(lockedPerks).toHaveLength(1);
      expect(lockedPerks[0].id).toBe('streak_master');
      expect(lockedPerks[0].isUnlocked).toBe(false);
    });
  });

  describe('hasUnlockedPerk', () => {
    it('returns false when no skill tree data', () => {
      const { hasUnlockedPerk } = useSkillTreeStore.getState();

      expect(hasUnlockedPerk('resilient_spirit')).toBe(false);
    });

    it('returns true for unlocked perk', () => {
      const { setSkillTreeData, hasUnlockedPerk } =
        useSkillTreeStore.getState();

      setSkillTreeData(mockSkillTreeData);

      expect(hasUnlockedPerk('resilient_spirit')).toBe(true);
      expect(hasUnlockedPerk('quest_mastery')).toBe(true);
    });

    it('returns false for locked perk', () => {
      const { setSkillTreeData, hasUnlockedPerk } =
        useSkillTreeStore.getState();

      setSkillTreeData(mockSkillTreeData);

      expect(hasUnlockedPerk('streak_master')).toBe(false);
    });

    it('returns false for non-existent perk', () => {
      const { setSkillTreeData, hasUnlockedPerk } =
        useSkillTreeStore.getState();

      setSkillTreeData(mockSkillTreeData);

      expect(hasUnlockedPerk('non_existent_perk')).toBe(false);
    });
  });

  describe('getPerkById', () => {
    it('returns null when no skill tree data', () => {
      const { getPerkById } = useSkillTreeStore.getState();

      expect(getPerkById('resilient_spirit')).toBeNull();
    });

    it('returns perk when found', () => {
      const { setSkillTreeData, getPerkById } = useSkillTreeStore.getState();

      setSkillTreeData(mockSkillTreeData);

      const perk = getPerkById('resilient_spirit');

      expect(perk).not.toBeNull();
      expect(perk?.id).toBe('resilient_spirit');
      expect(perk?.name).toBe('Resilient Spirit');
    });

    it('returns null when perk not found', () => {
      const { setSkillTreeData, getPerkById } = useSkillTreeStore.getState();

      setSkillTreeData(mockSkillTreeData);

      expect(getPerkById('non_existent_perk')).toBeNull();
    });
  });

  describe('getAvailablePerksToUnlock', () => {
    it('returns empty array when no skill tree data', () => {
      const { getAvailablePerksToUnlock } = useSkillTreeStore.getState();

      expect(getAvailablePerksToUnlock()).toEqual([]);
    });

    it('returns perks that meet level requirement and are not unlocked', () => {
      const { setSkillTreeData, getAvailablePerksToUnlock } =
        useSkillTreeStore.getState();

      // Mock data where level is 6, so streak_master (level 6) should be available
      const dataWithAvailablePerks: SkillTreeResponse = {
        ...mockSkillTreeData,
        currentLevel: 6,
        availablePerks: [
          ...mockSkillTreeData.availablePerks,
          {
            id: 'second_wind',
            name: 'Second Wind',
            description: 'Double XP after failure',
            levelRequired: 8,
            category: 'universal',
            isUnlocked: false,
            isChoice: false,
          },
        ],
      };

      setSkillTreeData(dataWithAvailablePerks);

      const availablePerks = getAvailablePerksToUnlock();

      expect(availablePerks).toHaveLength(1);
      expect(availablePerks[0].id).toBe('streak_master');
      expect(availablePerks[0].levelRequired).toBeLessThanOrEqual(6);
    });

    it('excludes perks above current level', () => {
      const { setSkillTreeData, getAvailablePerksToUnlock } =
        useSkillTreeStore.getState();

      // Level 5, so streak_master (level 6) should NOT be available
      setSkillTreeData(mockSkillTreeData);

      const availablePerks = getAvailablePerksToUnlock();

      expect(availablePerks).toHaveLength(0);
    });
  });
});
