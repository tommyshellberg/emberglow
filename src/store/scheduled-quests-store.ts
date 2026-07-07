/**
 * Scheduled Quests (Events) Store
 *
 * Holds the user's event registrations and settlement summaries. Discovery
 * and event-detail server data is managed by TanStack Query hooks
 * (src/api/scheduled-quests) - this store only keeps what must survive
 * screen unmounts: "my events" (for the list + overlap annotation) and
 * quest:settled payloads (for the results screen). Never touches
 * quest-store: the active-quest singleton is only involved at T-0 via the
 * standard cooperative handoff.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { type ScheduledQuestRun } from '@/features/scheduled-quests/types';
import { type QuestSettledPayload } from '@/lib/services/websocket-events.types';
import { getItem, removeItem, setItem } from '@/lib/storage';

interface ScheduledQuestsState {
  myRegistrations: ScheduledQuestRun[];
  settlements: Record<string, QuestSettledPayload>;
}

interface ScheduledQuestsActions {
  setMyRegistrations: (runs: ScheduledQuestRun[]) => void;
  upsertRegistration: (run: ScheduledQuestRun) => void;
  removeRegistration: (questRunId: string) => void;
  recordSettlement: (settlement: QuestSettledPayload) => void;
  reset: () => void;
}

type ScheduledQuestsStore = ScheduledQuestsState & ScheduledQuestsActions;

const initialState: ScheduledQuestsState = {
  myRegistrations: [],
  settlements: {},
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

export const useScheduledQuestsStore = create<ScheduledQuestsStore>()(
  persist(
    (set) => ({
      ...initialState,

      setMyRegistrations: (runs) => set({ myRegistrations: runs }),

      upsertRegistration: (run) =>
        set((state) => ({
          myRegistrations: state.myRegistrations.some((r) => r.id === run.id)
            ? state.myRegistrations.map((r) => (r.id === run.id ? run : r))
            : [...state.myRegistrations, run],
        })),

      removeRegistration: (questRunId) =>
        set((state) => ({
          myRegistrations: state.myRegistrations.filter(
            (r) => r.id !== questRunId
          ),
        })),

      recordSettlement: (settlement) =>
        set((state) => ({
          settlements: {
            ...state.settlements,
            [settlement.questRunId]: settlement,
          },
          myRegistrations: state.myRegistrations.filter(
            (r) => r.id !== settlement.questRunId
          ),
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'scheduled-quests-storage',
      storage: createJSONStorage(() => ({
        getItem: getItemForStorage,
        setItem: setItemForStorage,
        removeItem: removeItemForStorage,
      })),
      partialize: (state) => ({
        myRegistrations: state.myRegistrations,
        settlements: state.settlements,
      }),
    }
  )
);
