import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/lib/storage';

import { type Character, type CharacterType, type XP } from './types';

interface CharacterState {
  character: Character | null;
  dailyQuestStreak: number;
  lastStreakCelebrationShown: number | null;
  createCharacter: (type: CharacterType, name: string) => void;
  updateCharacter: (updatedCharacter: Partial<Character>) => void;
  addXP: (amount: XP) => void;
  updateStreak: (
    previousCompletionTimestamp: number | null,
    now?: number
  ) => void;
  setStreak: (streak: number) => void;
  resetStreak: () => void;
  resetCharacter: () => void;
  markStreakCelebrationShown: () => void;
}

const INITIAL_CHARACTER: Omit<Character, 'type' | 'name'> = {
  level: 1,
  currentXP: 0, // Total XP, not progress
};

const calculateXPForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, level - 1));
};

/**
 * Whole calendar days between two instants in the device's timezone.
 * Uses Date.UTC on the local date parts so a 23- or 25-hour daylight-saving
 * day still counts as exactly one day.
 */
export const localCalendarDaysBetween = (
  earlier: number,
  later: number
): number => {
  const a = new Date(earlier);
  const b = new Date(later);
  const aDay = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bDay = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bDay - aDay) / 86_400_000);
};

// Create type-safe functions for Zustand's storage
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

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      character: null,
      dailyQuestStreak: 0,
      lastStreakCelebrationShown: null,
      createCharacter: (type, name) =>
        set({
          character: {
            ...INITIAL_CHARACTER,
            type,
            name,
          },
        }),

      updateCharacter: (updatedCharacter) => {
        const currentCharacter = get().character;
        if (!currentCharacter) return;

        set({
          character: {
            ...currentCharacter,
            ...updatedCharacter,
          } as Character,
        });
      },

      addXP: (amount) => {
        const { character } = get();
        if (!character) return;

        // Import levels data for accurate level calculation
        const { levels } = require('@/app/data/level-progression');

        // Add XP to total
        const newTotalXP = character.currentXP + amount;

        // Find new level based on total XP
        let newLevel = 1;
        for (let i = levels.length - 1; i >= 0; i--) {
          if (newTotalXP >= levels[i].totalXPRequired) {
            newLevel = levels[i].level;
            break;
          }
        }

        set({
          character: {
            ...character,
            level: newLevel,
            currentXP: newTotalXP, // Store total XP, not progress
            // Remove xpToNextLevel - we calculate it from static data now
          },
        });
      },

      resetCharacter: () => {
        set((state) => ({
          ...state,
          character: null,
          dailyQuestStreak: 0,
          lastStreakCelebrationShown: null,
        }));
      },

      // Optimistic local rule after a quest completion. The server owns the
      // streak; its value replaces this on the next refreshUser() call.
      //   no previous completion        → 1
      //   same local calendar day       → unchanged (0 becomes 1)
      //   next local calendar day       → +1
      //   two or more days later        → 1
      updateStreak: (previousCompletionTimestamp, now = Date.now()) => {
        const currentStreak = get().dailyQuestStreak;

        if (!previousCompletionTimestamp) {
          set({ dailyQuestStreak: 1 });
          return;
        }

        const gap = localCalendarDaysBetween(previousCompletionTimestamp, now);

        if (gap === 0) {
          if (currentStreak === 0) set({ dailyQuestStreak: 1 });
          return;
        }
        if (gap === 1) {
          set({ dailyQuestStreak: currentStreak + 1 });
          return;
        }
        set({ dailyQuestStreak: 1 });
      },

      // Method to set streak directly (for syncing from server)
      setStreak: (streak) => {
        set({ dailyQuestStreak: streak });
      },

      // Method to reset streak
      resetStreak: () => {
        set({ dailyQuestStreak: 0 });
      },

      // Track when streak celebration was last shown
      markStreakCelebrationShown: () => {
        set({ lastStreakCelebrationShown: Date.now() });
      },
    }),
    {
      name: 'character-storage',
      storage: createJSONStorage(() => ({
        getItem: getItemForStorage,
        setItem: setItemForStorage,
        removeItem: removeItemForStorage,
      })),
    }
  )
);
