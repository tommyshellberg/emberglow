import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/lib/storage';

import { type NarratorVoice } from './types';

type ReminderTime = {
  hour: number;
  minute: number;
} | null;

type DailyReminder = {
  enabled: boolean;
  time: ReminderTime;
};

type Nudges = {
  enabled: boolean;
};

type SettingsState = {
  dailyReminder: DailyReminder;
  nudges: Nudges;
  setDailyReminder: (reminder: DailyReminder) => void;
  setNudges: (nudges: Nudges) => void;
  hasBeenPromptedForReminder: boolean;
  setHasBeenPromptedForReminder: (value: boolean) => void;
  narratorVoice: NarratorVoice | null;
  setNarratorVoice: (voice: NarratorVoice) => void;
  onboardingSoundEnabled: boolean;
  setOnboardingSoundEnabled: (enabled: boolean) => void;
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
      nudges: {
        enabled: true,
      },
      setDailyReminder: (reminder) => set({ dailyReminder: reminder }),
      setNudges: (nudges) => set({ nudges }),
      hasBeenPromptedForReminder: false,
      setHasBeenPromptedForReminder: (value) =>
        set({ hasBeenPromptedForReminder: value }),
      narratorVoice: null,
      setNarratorVoice: (voice) => set({ narratorVoice: voice }),
      onboardingSoundEnabled: true,
      setOnboardingSoundEnabled: (enabled) =>
        set({ onboardingSoundEnabled: enabled }),
    }),
    {
      name: 'unquest-settings',
      version: 1,
      // v0 → v1: streak warnings became server-sent nudges; drop the local setting.
      migrate: (persisted, version) => {
        const state = { ...(persisted as Record<string, unknown>) };
        if (!(typeof version === 'number' && version >= 1)) {
          delete state.streakWarning;
        }
        return state as unknown as SettingsState;
      },
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
