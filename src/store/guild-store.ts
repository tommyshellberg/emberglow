/**
 * Guild Store
 *
 * Client-side state for guild UI interactions.
 * Server data (guild list, details) is managed by TanStack Query hooks.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/lib/storage';

interface GuildUIState {
  // Current guild being viewed (for navigation)
  currentGuildId: string | null;

  // Modal visibility states
  isCreateModalOpen: boolean;
  isJoinModalOpen: boolean;
  isInviteCodeModalOpen: boolean;

  // The guild ID for which invite code modal is open
  inviteCodeGuildId: string | null;
}

interface GuildUIActions {
  // Navigation
  setCurrentGuild: (guildId: string | null) => void;

  // Create modal
  openCreateModal: () => void;
  closeCreateModal: () => void;

  // Join modal
  openJoinModal: () => void;
  closeJoinModal: () => void;

  // Invite code modal
  openInviteCodeModal: (guildId: string) => void;
  closeInviteCodeModal: () => void;

  // Reset all UI state
  reset: () => void;
}

type GuildStore = GuildUIState & GuildUIActions;

const initialState: GuildUIState = {
  currentGuildId: null,
  isCreateModalOpen: false,
  isJoinModalOpen: false,
  isInviteCodeModalOpen: false,
  inviteCodeGuildId: null,
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

export const useGuildStore = create<GuildStore>()(
  persist(
    (set) => ({
      ...initialState,

      // Navigation
      setCurrentGuild: (guildId) => set({ currentGuildId: guildId }),

      // Create modal
      openCreateModal: () => set({ isCreateModalOpen: true }),
      closeCreateModal: () => set({ isCreateModalOpen: false }),

      // Join modal
      openJoinModal: () => set({ isJoinModalOpen: true }),
      closeJoinModal: () => set({ isJoinModalOpen: false }),

      // Invite code modal
      openInviteCodeModal: (guildId) =>
        set({
          isInviteCodeModalOpen: true,
          inviteCodeGuildId: guildId,
        }),
      closeInviteCodeModal: () =>
        set({
          isInviteCodeModalOpen: false,
          inviteCodeGuildId: null,
        }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'guild-storage',
      storage: createJSONStorage(() => ({
        getItem: getItemForStorage,
        setItem: setItemForStorage,
        removeItem: removeItemForStorage,
      })),
      // Only persist currentGuildId, not modal states
      partialize: (state) => ({
        currentGuildId: state.currentGuildId,
      }),
    }
  )
);

/**
 * Selectors for accessing specific parts of the guild store
 */
export const guildSelectors = {
  currentGuildId: (state: GuildStore) => state.currentGuildId,
  isCreateModalOpen: (state: GuildStore) => state.isCreateModalOpen,
  isJoinModalOpen: (state: GuildStore) => state.isJoinModalOpen,
  isInviteCodeModalOpen: (state: GuildStore) => state.isInviteCodeModalOpen,
  inviteCodeGuildId: (state: GuildStore) => state.inviteCodeGuildId,
};
