import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/lib/storage';

/**
 * Store review prompt gating.
 *
 * Owns the single persisted timestamp behind the automatic
 * StoreReview.requestReview() call, plus the pure eligibility decision —
 * same shape as announcement-store's pure-selector-next-to-state pattern.
 *
 * The completed-quest count is deliberately NOT duplicated here; callers
 * read it live from quest-store (completedQuests holds only successes).
 */

export const MIN_COMPLETED_QUESTS = 3;
export const REVIEW_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

export type ShouldRequestReviewInput = {
  completedQuestCount: number;
  lastRequestedAt: number | null;
  now: number;
};

/**
 * Pure decision: is the user eligible for a native review prompt right now?
 * The OS applies its own rate limit on top (iOS ~3/365 days); the 90-day
 * cooldown spends that budget deliberately and keeps Android polite.
 */
export function shouldRequestReview({
  completedQuestCount,
  lastRequestedAt,
  now,
}: ShouldRequestReviewInput): boolean {
  if (completedQuestCount < MIN_COMPLETED_QUESTS) {
    return false;
  }
  if (lastRequestedAt === null) {
    return true;
  }
  return now - lastRequestedAt >= REVIEW_COOLDOWN_MS;
}

type ReviewPromptStore = {
  lastRequestedAt: number | null;
  recordReviewRequested: (now: number) => void;
};

const getItemForStorage = (name: string) => {
  const value = getItem<string>(name);
  return value ?? null;
};

export const useReviewPromptStore = create<ReviewPromptStore>()(
  persist(
    (set) => ({
      lastRequestedAt: null,
      recordReviewRequested: (now) => set({ lastRequestedAt: now }),
    }),
    {
      name: 'unquest-review-prompt',
      storage: createJSONStorage(() => ({
        getItem: getItemForStorage,
        setItem: setItem,
        removeItem: removeItem,
      })),
      onRehydrateStorage: (_initialState) => {
        return (_state, error) => {
          if (error) {
            console.error(
              'An error occurred during review prompt store hydration:',
              error
            );
          }
        };
      },
    }
  )
);
