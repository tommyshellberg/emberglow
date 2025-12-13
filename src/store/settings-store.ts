import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/lib/storage';

type ReminderTime = {
  hour: number;
  minute: number;
} | null;

type DailyReminder = {
  enabled: boolean;
  time: ReminderTime;
};

type StreakWarning = {
  enabled: boolean;
  time: ReminderTime;
};

type SettingsState = {
  dailyReminder: DailyReminder;
  streakWarning: StreakWarning;
  setDailyReminder: (reminder: DailyReminder) => void;
  setStreakWarning: (streakWarning: StreakWarning) => void;
  hasBeenPromptedForReminder: boolean;
  setHasBeenPromptedForReminder: (value: boolean) => void;
  hasSeenBranchingAnnouncement: boolean;
  setHasSeenBranchingAnnouncement: (value: boolean) => void;
  hasSeenSkillTreeAnnouncement: boolean;
  setHasSeenSkillTreeAnnouncement: (value: boolean) => void;
};

const getItemForStorage = (name: string) => {
  const value = getItem<string>(name);
  return value ?? null;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      dailyReminder: {
        enabled: false,
        time: null,
      },
      streakWarning: {
        enabled: true,
        time: { hour: 18, minute: 0 },
      },
      setDailyReminder: (reminder) => set({ dailyReminder: reminder }),
      setStreakWarning: (streakWarning) => set({ streakWarning }),
      hasBeenPromptedForReminder: false,
      setHasBeenPromptedForReminder: (value) =>
        set({ hasBeenPromptedForReminder: value }),
      hasSeenBranchingAnnouncement: false,
      setHasSeenBranchingAnnouncement: (value) =>
        set({ hasSeenBranchingAnnouncement: value }),
      hasSeenSkillTreeAnnouncement: false,
      setHasSeenSkillTreeAnnouncement: (value) =>
        set({ hasSeenSkillTreeAnnouncement: value }),
    }),
    {
      name: 'unquest-settings',
      storage: createJSONStorage(() => ({
        getItem: getItemForStorage,
        setItem: setItem,
        removeItem: removeItem,
      })),
      onRehydrateStorage: (_initialState) => {
        return (state, error) => {
          if (error) {
            console.error(
              'An error occurred during settings store hydration:',
              error
            );
          }
        };
      },
    }
  )
);
