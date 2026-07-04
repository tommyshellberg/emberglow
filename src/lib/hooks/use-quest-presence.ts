/**
 * Read-only view hook for the active-quest screen (Task 13). Derives display
 * values from the presence runtime's machine-driven view state (Task 9) and
 * the active quest's metadata — computes NO pass/fail decision of its own.
 *
 * Two update sources are combined:
 *  - `useSyncExternalStore` on the runtime's view listeners, for STATE
 *    transitions (IN_APP/LOCKED/AWAY/FAILED/COMPLETED).
 *  - A local 1s tick, for the smooth countdown/multiplier recompute the
 *    runtime deliberately no longer drives per-second (see
 *    quest-presence-runtime.ts's manageAliveTick comment).
 *
 * Spec: docs/superpowers/specs/2026-07-03-unified-quest-presence-design.md
 */
import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  forecastPresenceXP,
  liveMultiplier as calcLiveMultiplier,
} from '@/lib/services/presence-forecast';
import type { PresenceState } from '@/lib/services/quest-presence-machine';
import {
  getViewState,
  subscribeToViewState,
} from '@/lib/services/quest-presence-runtime';
import { getItem } from '@/lib/storage';
import { useQuestStore } from '@/store/quest-store';

const TICK_MS = 1000;
const MUTED_KEY = 'quest-audio-muted';

// TODO(presence-multiplier): activeQuest carries no perk multiplier while a
// quest is active — `participants[].rewards.multiplier` is only populated by
// completeQuest() AFTER the run finishes (see quest-store.ts's completeQuest
// mapping `questRunData.participants`). If an active-quest multiplier source
// becomes available (e.g. the run-start response), source it here instead of
// defaulting to 1. A v1 that starts at 1.0x and climbs with locked time is
// acceptable per the design.
const DEFAULT_MULTIPLIER = 1;

const isActiveRunState = (state: PresenceState) =>
  state === 'IN_APP' || state === 'LOCKED' || state === 'AWAY';

export interface QuestPresenceView {
  state: PresenceState | null;
  remainingMs: number;
  lockedMs: number;
  liveMultiplier: number;
  forecast: { current: number; maxIfLocked: number };
  isMuted: boolean;
  questTitle: string | undefined;
  mode: 'story' | 'custom' | undefined;
}

export function useQuestPresence(): QuestPresenceView {
  const view = useSyncExternalStore(subscribeToViewState, getViewState);
  const activeQuest = useQuestStore((s) => s.activeQuest);

  const context = view.context;
  const runState = context?.state ?? null;
  const isLiveRun = runState != null && isActiveRunState(runState);

  // Forces a re-render every second while a non-terminal run is active, so
  // the countdown and live multiplier animate even though the runtime only
  // notifies listeners on real state transitions.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isLiveRun) return undefined;
    const interval = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(interval);
  }, [isLiveRun]);

  const now = Date.now();

  const remainingMs = context ? Math.max(0, context.scheduledEndTime - now) : 0;

  const lockedMs = context
    ? context.lockedMs +
      (context.state === 'LOCKED' && context.lockedSegmentStart != null
        ? now - context.lockedSegmentStart
        : 0)
    : 0;

  const baseXP = activeQuest?.reward?.xp ?? 0;
  const multiplier = DEFAULT_MULTIPLIER;

  const totalDurationMs = context
    ? context.scheduledEndTime - context.actualStartTime
    : 0;

  return {
    state: runState,
    remainingMs,
    lockedMs,
    liveMultiplier: calcLiveMultiplier({
      multiplier,
      lockedMs,
      totalDurationMs,
    }),
    forecast: forecastPresenceXP({ baseXP, multiplier }),
    isMuted: !!getItem(MUTED_KEY),
    questTitle: activeQuest?.title,
    mode: activeQuest?.mode,
  };
}
