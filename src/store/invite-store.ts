import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/lib/storage';

export type PendingInvite = { code: string; inviterName: string };

type InviteState = {
  // State
  pendingInvite: PendingInvite | null; // drives the confirm modal
  stashedCode: string | null; // universal-link code captured before onboarding
  matchChecked: boolean; // first-launch match already attempted

  // Actions
  setPendingInvite: (p: PendingInvite) => void;
  clearPendingInvite: () => void;
  stashCode: (code: string) => void;
  consumeStashedCode: () => string | null; // returns and clears
  setMatchChecked: () => void;
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

export const useInviteStore = create<InviteState>()(
  persist(
    (set, get) => ({
      // Initial state
      pendingInvite: null,
      stashedCode: null,
      matchChecked: false,

      // Actions
      setPendingInvite: (p) => {
        set({ pendingInvite: p });
      },

      clearPendingInvite: () => {
        set({ pendingInvite: null });
      },

      stashCode: (code) => {
        set({ stashedCode: code });
      },

      consumeStashedCode: () => {
        const code = get().stashedCode;
        set({ stashedCode: null });
        return code;
      },

      setMatchChecked: () => {
        set({ matchChecked: true });
      },
    }),
    {
      name: 'invite-storage',
      storage: createJSONStorage(() => ({
        getItem: getItemForStorage,
        setItem: setItemForStorage,
        removeItem: removeItemForStorage,
      })),
    }
  )
);
