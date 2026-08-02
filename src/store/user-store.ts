// src/store/user-store.ts
import * as Sentry from '@sentry/react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/lib/storage';
import { type User } from '@/store/types';

interface UserState {
  user: User | null;
  setUser: (user: User) => void;
  updateUser: (userData: Partial<User>) => void;
  clearUser: () => void;
}

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

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => {
        Sentry.setUser({ id: user.id }); // id only - no email (GDPR)
        set({ user });
      },
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
      clearUser: () => {
        Sentry.setUser(null);
        set({ user: null });
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => ({
        getItem: getItemForStorage,
        setItem: setItemForStorage,
        removeItem: removeItemForStorage,
      })),
      onRehydrateStorage: () => (state) => {
        console.log('[UserStore] Rehydrated with user:', state?.user?.id);
        console.log('[UserStore] Feature flags:', state?.user?.featureFlags);
      },
    }
  )
);
