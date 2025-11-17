import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Perk, SkillTreeResponse } from '@/api/skill-tree/types';
import { getItem, removeItem, setItem } from '@/lib/storage';

interface SkillTreeState {
  // State
  skillTreeData: SkillTreeResponse | null;

  // Actions
  setSkillTreeData: (data: SkillTreeResponse) => void;
  clearSkillTreeData: () => void;

  // Selectors/Getters
  getUnlockedPerks: () => Perk[];
  getLockedPerks: () => Perk[];
  hasUnlockedPerk: (perkId: string) => boolean;
  getPerkById: (perkId: string) => Perk | null;
  getAvailablePerksToUnlock: () => Perk[];
}

// Create type-safe storage wrappers
const getItemForStorage = (name: string) => {
  const value = getItem<string>(name);
  return value ?? null;
};

const setItemForStorage = async (name: string, value: string) => {
  setItem(name, value);
};

const removeItemForStorage = async (name: string) => {
  removeItem(name);
};

export const useSkillTreeStore = create<SkillTreeState>()(
  persist(
    (set, get) => ({
      // Initial state
      skillTreeData: null,

      // Actions
      setSkillTreeData: (data) => set({ skillTreeData: data }),

      clearSkillTreeData: () => set({ skillTreeData: null }),

      // Selectors/Getters
      getUnlockedPerks: () => {
        const { skillTreeData } = get();
        if (!skillTreeData) return [];

        return skillTreeData.availablePerks.filter((perk) => perk.isUnlocked);
      },

      getLockedPerks: () => {
        const { skillTreeData } = get();
        if (!skillTreeData) return [];

        return skillTreeData.availablePerks.filter((perk) => !perk.isUnlocked);
      },

      hasUnlockedPerk: (perkId) => {
        const { skillTreeData } = get();
        if (!skillTreeData) return false;

        return skillTreeData.availablePerks.some(
          (perk) => perk.id === perkId && perk.isUnlocked
        );
      },

      getPerkById: (perkId) => {
        const { skillTreeData } = get();
        if (!skillTreeData) return null;

        return (
          skillTreeData.availablePerks.find((perk) => perk.id === perkId) || null
        );
      },

      getAvailablePerksToUnlock: () => {
        const { skillTreeData } = get();
        if (!skillTreeData) return [];

        return skillTreeData.availablePerks.filter(
          (perk) =>
            !perk.isUnlocked &&
            perk.levelRequired <= skillTreeData.currentLevel
        );
      },
    }),
    {
      name: 'skill-tree-storage',
      storage: createJSONStorage(() => ({
        getItem: getItemForStorage,
        setItem: setItemForStorage,
        removeItem: removeItemForStorage,
      })),
    }
  )
);
