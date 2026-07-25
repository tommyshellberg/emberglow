import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/lib/storage';

/**
 * Announcement gating store.
 *
 * Owns the three home-screen "new feature" announcement flags together with the
 * timing state and the once-per-day decision that used to live as three
 * uncoordinated `useEffect`s in `src/app/(app)/index.tsx`. Co-locating the
 * "should show today" selector with the state it reads mirrors how `quest-store`
 * keeps `shouldShowStreakCelebration()` next to `lastCompletedQuestTimestamp`.
 *
 * Anti-bombardment rule: at most ONE announcement per calendar day. Each modal's
 * own engagement precondition (first branch complete / perks available / >=3
 * quests) still gates whether it is a candidate; the day-cap prevents a returning
 * user from getting all three stacked in one session.
 */

export type AnnouncementKey = 'branching' | 'skillTree' | 'guilds';

/**
 * Preconditions the store cannot read itself — supplied by the home screen from
 * its existing hooks (quest-store, user-store, skill-tree-store).
 */
export type AnnouncementContext = {
  hasCompletedFirstBranch: boolean;
  isRegistered: boolean;
  completedQuestCount: number;
  availablePerksCount: number;
};

/** The seen/timing slice the pure selector reads. */
export type AnnouncementSeenState = {
  hasSeenBranchingAnnouncement: boolean;
  hasSeenSkillTreeAnnouncement: boolean;
  hasSeenGuildsAnnouncement: boolean;
  lastAnnouncementShownAt: number | null;
};

type LegacyAnnouncementFlags = {
  hasSeenBranchingAnnouncement: boolean;
  hasSeenSkillTreeAnnouncement: boolean;
  hasSeenGuildsAnnouncement: boolean;
};

const NO_LEGACY_FLAGS: LegacyAnnouncementFlags = {
  hasSeenBranchingAnnouncement: false,
  hasSeenSkillTreeAnnouncement: false,
  hasSeenGuildsAnnouncement: false,
};

/**
 * Extract the three `hasSeen*` booleans from the legacy `unquest-settings`
 * persist blob so existing users are not re-shown announcements they already
 * dismissed.
 *
 * The value handed in is whatever `@/lib/storage`.getItem('unquest-settings')
 * returns. Because the persist envelope is stored as a JSON string that
 * `@/lib/storage` double-encodes, the un-wrapped value is frequently still a
 * JSON string — so this tolerates both a string and an already-parsed object,
 * and never throws on malformed data.
 */
export function parseLegacyAnnouncementFlags(
  raw: unknown
): LegacyAnnouncementFlags {
  let envelope: unknown = raw;

  if (typeof envelope === 'string') {
    try {
      envelope = JSON.parse(envelope);
    } catch {
      return NO_LEGACY_FLAGS;
    }
  }

  if (!envelope || typeof envelope !== 'object') {
    return NO_LEGACY_FLAGS;
  }

  const state = (envelope as { state?: unknown }).state;
  if (!state || typeof state !== 'object') {
    return NO_LEGACY_FLAGS;
  }

  const legacy = state as Record<string, unknown>;
  return {
    hasSeenBranchingAnnouncement: legacy.hasSeenBranchingAnnouncement === true,
    hasSeenSkillTreeAnnouncement: legacy.hasSeenSkillTreeAnnouncement === true,
    hasSeenGuildsAnnouncement: legacy.hasSeenGuildsAnnouncement === true,
  };
}

/**
 * Pure decision: which announcement (if any) should be shown right now.
 *
 * Two product decisions are encoded here:
 *   1. Once-per-day cap — "same day" is a calendar-day boundary via
 *      `toDateString()`, matching quest-store's `shouldShowStreakCelebration`.
 *      If `lastAnnouncementShownAt` falls on the same day as `now`, nothing
 *      shows today.
 *   2. Priority order — because of the day-cap, whichever is checked first is
 *      the one that shows *today*; the rest wait for a later day. Order is
 *      branching → skillTree → guilds (story progression first, social last).
 *
 * Preconditions (from `ctx`) match the three effects this replaced verbatim:
 *   - branching : ctx.hasCompletedFirstBranch
 *   - skillTree : ctx.isRegistered && ctx.availablePerksCount > 0
 *   - guilds    : ctx.isRegistered && ctx.completedQuestCount >= 3
 */
export function getAnnouncementToShow(
  state: AnnouncementSeenState,
  ctx: AnnouncementContext,
  now: number = Date.now()
): AnnouncementKey | null {
  // Once-per-day cap: nothing shows if one already showed today.
  if (
    state.lastAnnouncementShownAt !== null &&
    new Date(state.lastAnnouncementShownAt).toDateString() ===
      new Date(now).toDateString()
  ) {
    return null;
  }

  // Fixed priority: first unseen + precondition-met announcement wins today.
  if (!state.hasSeenBranchingAnnouncement && ctx.hasCompletedFirstBranch) {
    return 'branching';
  }
  if (
    !state.hasSeenSkillTreeAnnouncement &&
    ctx.isRegistered &&
    ctx.availablePerksCount > 0
  ) {
    return 'skillTree';
  }
  if (
    !state.hasSeenGuildsAnnouncement &&
    ctx.isRegistered &&
    ctx.completedQuestCount >= 3
  ) {
    return 'guilds';
  }

  return null;
}

type AnnouncementStore = AnnouncementSeenState & {
  setHasSeenBranchingAnnouncement: (value: boolean) => void;
  setHasSeenSkillTreeAnnouncement: (value: boolean) => void;
  setHasSeenGuildsAnnouncement: (value: boolean) => void;
  /**
   * Stamp the once-per-day throttle. Fires when a sheet is *presented*, not when
   * it is dismissed — a user who force-quits without dismissing has still used
   * up today's one announcement.
   */
  markAnnouncementShown: () => void;
  getAnnouncementToShow: (ctx: AnnouncementContext) => AnnouncementKey | null;
};

const getItemForStorage = (name: string) => {
  const value = getItem<string>(name);
  return value ?? null;
};

/**
 * Seed the initial `hasSeen*` flags from the legacy settings blob. Persist's
 * shallow merge then overrides these with the announcement store's OWN persisted
 * values on every launch after the first — so first launch inherits the legacy
 * dismissals, and genuine dismissals recorded here are never clobbered later.
 */
const legacySeed = parseLegacyAnnouncementFlags(getItem('unquest-settings'));

export const useAnnouncementStore = create<AnnouncementStore>()(
  persist(
    (set, get) => ({
      hasSeenBranchingAnnouncement: legacySeed.hasSeenBranchingAnnouncement,
      hasSeenSkillTreeAnnouncement: legacySeed.hasSeenSkillTreeAnnouncement,
      hasSeenGuildsAnnouncement: legacySeed.hasSeenGuildsAnnouncement,
      lastAnnouncementShownAt: null,
      setHasSeenBranchingAnnouncement: (value) =>
        set({ hasSeenBranchingAnnouncement: value }),
      setHasSeenSkillTreeAnnouncement: (value) =>
        set({ hasSeenSkillTreeAnnouncement: value }),
      setHasSeenGuildsAnnouncement: (value) =>
        set({ hasSeenGuildsAnnouncement: value }),
      markAnnouncementShown: () => set({ lastAnnouncementShownAt: Date.now() }),
      getAnnouncementToShow: (ctx) => getAnnouncementToShow(get(), ctx),
    }),
    {
      name: 'unquest-announcements',
      storage: createJSONStorage(() => ({
        getItem: getItemForStorage,
        setItem: setItem,
        removeItem: removeItem,
      })),
      onRehydrateStorage: (_initialState) => {
        return (_state, error) => {
          if (error) {
            console.error(
              'An error occurred during announcement store hydration:',
              error
            );
          }
        };
      },
    }
  )
);
