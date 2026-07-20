/**
 * Presence runtime — the ONLY file (besides the native modules themselves)
 * that touches AppState, the lock-state native module, timers, MMKV storage,
 * and the network for presence quest runs. It bridges raw device signals to
 * the pure `quest-presence-machine` and executes the effects it returns.
 *
 * An active COOPERATIVE run's lock/unlock signals are routed UNCHANGED to the
 * legacy `QuestTimer.onPhoneLocked`/`onPhoneUnlocked` handlers — coop never
 * reaches the machine (that would double-drive the lock PATCH). Coop never
 * consumed AppState before, so AppState is not forwarded to it either.
 *
 * Consolidates the lock-detection mount: `useLockStateDetection()` used to be
 * mounted twice (root layout + (app) layout), double-firing lock handlers.
 * `usePresenceRuntime()` must be mounted exactly ONCE, at the app root.
 *
 * Spec: docs/superpowers/specs/2026-07-03-unified-quest-presence-design.md
 */
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import addLockListener from '@/../modules/lock-state';
import {
  cancelPresenceWarningNotification,
  schedulePresenceWarningNotification,
} from '@/lib/services/notifications';
import {
  confirmQuestRun,
  updatePhoneLockStatus,
  updateQuestRunStatus,
} from '@/lib/services/quest-run-service';
import QuestTimer from '@/lib/services/quest-timer';
import { getItem, removeItem, setItem } from '@/lib/storage';
import { useQuestStore } from '@/store/quest-store';
import type { Quest } from '@/store/types';

import {
  initPresenceContext,
  type PresenceConfig,
  type PresenceContext,
  type PresenceEffect,
  type PresenceEvent,
  presenceReducer,
  type PresenceSnapshot,
  rehydratePresence,
} from './quest-presence-machine';

export const snapshotKey = (runId: string) => `presence-snapshot-${runId}`;

// Liveness tick cadence — see manageAliveTick().
const ALIVE_TICK_MS = 1000;

/** Read-only view of the current presence session — consumed by useQuestPresence() (Task 10). */
export interface PresenceViewState {
  runId: string | null;
  context: PresenceContext | null;
}

type ViewListener = (view: PresenceViewState) => void;

// --- module-level runtime state. Singleton by design: the app manages at
// most one live presence session at a time (one active solo presence run). ---
let currentRunId: string | null = null;
let ctx: PresenceContext | null = null;

let appStateSub: { remove: () => void } | null = null;
let lockSub: { remove: () => void } | null = null;
let unlockSub: { remove: () => void } | null = null;
let storeUnsub: (() => void) | null = null;

let graceTimer: ReturnType<typeof setTimeout> | null = null;
let completeTimer: ReturnType<typeof setTimeout> | null = null;
let aliveInterval: ReturnType<typeof setInterval> | null = null;

const viewListeners = new Set<ViewListener>();

// Cached, referentially-stable view. Rebuilt ONLY on a real transition (inside
// notify()) so getViewState() returns the same object reference between
// transitions — required by Task 10's useSyncExternalStore getSnapshot, which
// crashes ("getSnapshot should be cached") if handed a fresh object each call.
let cachedView: PresenceViewState = { runId: null, context: null };

function notify() {
  cachedView = { runId: currentRunId, context: ctx };
  // Per-listener isolation: a throwing consumer must not abort the runtime
  // (e.g. dropping the effects that run after notify()).
  viewListeners.forEach((listener) => {
    try {
      listener(cachedView);
    } catch (error) {
      console.error('[PresenceRuntime] view listener threw:', error);
    }
  });
}

/** Current view state, e.g. for useQuestPresence() to read on first render. */
export function getViewState(): PresenceViewState {
  return cachedView;
}

/** Subscribe to view-state changes. Returns an unsubscribe function. */
export function subscribeToViewState(listener: ViewListener): () => void {
  viewListeners.add(listener);
  return () => viewListeners.delete(listener);
}

// --- offline tolerance: a lost PATCH/report is benign per spec — never let
// an effect's throw crash the runtime. ---
async function safe(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    console.error('[PresenceRuntime] effect failed:', error);
  }
}

function safeSync(fn: () => void) {
  try {
    fn();
  } catch (error) {
    console.error('[PresenceRuntime] effect failed:', error);
  }
}

function persistSnapshot(runId: string, context: PresenceContext) {
  safeSync(() => {
    const snapshot: PresenceSnapshot = {
      state: context.state,
      enteredAt: context.enteredAt,
      lockedMs: context.lockedMs,
      lastAliveAt: context.lastAliveAt,
    };
    setItem(snapshotKey(runId), snapshot);
  });
}

function clearGraceTimer() {
  if (graceTimer) {
    clearTimeout(graceTimer);
    graceTimer = null;
  }
}

function clearCompleteTimer() {
  if (completeTimer) {
    clearTimeout(completeTimer);
    completeTimer = null;
  }
}

function clearAliveInterval() {
  if (aliveInterval) {
    clearInterval(aliveInterval);
    aliveInterval = null;
  }
}

function clearAllTimers() {
  clearGraceTimer();
  clearCompleteTimer();
  clearAliveInterval();
}

// Liveness tick (spec G): while IN_APP, cheaply anchor lastAliveAt every
// second so a cold-start crash judgment starts its grace clock at the moment
// the app actually died, not at whenever the state was last entered.
//
// Deliberately writes lastAliveAt STRAIGHT to the persisted MMKV snapshot —
// it does NOT reassign in-memory `ctx` or call notify(). Cold start reads
// lastAliveAt from the snapshot, not from ctx, so this is sufficient; and it
// keeps the cached view referentially stable (no per-second churn) — Task 10
// owns its own 1s countdown re-render.
function manageAliveTick() {
  const shouldTick = ctx?.state === 'IN_APP';
  if (shouldTick && !aliveInterval) {
    aliveInterval = setInterval(() => {
      const c = ctx;
      const runId = currentRunId;
      if (!c || !runId) return;
      safeSync(() =>
        setItem(snapshotKey(runId), {
          state: c.state,
          enteredAt: c.enteredAt,
          lockedMs: c.lockedMs,
          lastAliveAt: Date.now(),
        } satisfies PresenceSnapshot)
      );
    }, ALIVE_TICK_MS);
  } else if (!shouldTick && aliveInterval) {
    clearAliveInterval();
  }
}

function armCompletionTimer(scheduledEndTime: number) {
  clearCompleteTimer();
  completeTimer = setTimeout(
    () => dispatch({ type: 'TIMER_COMPLETE' }),
    Math.max(0, scheduledEndTime - Date.now())
  );
}

// Report to the server, then ALWAYS run the local store mutation — even if the
// report rejects. The two MUST be decoupled: the machine is terminal after a
// fail/complete (ignores all further events) and endSession only fires once the
// store's activeQuest clears — which IS the local mutation. So a report thrown
// inside a combined try would strand the run forever (terminal machine, store
// still "active", timers stopped) with no recovery short of killing the app —
// a very plausible path for an off-network, locked-phone feature.
function reportThenCommit(
  report: () => Promise<unknown>,
  commit: () => void | Promise<unknown>
) {
  void (async () => {
    try {
      await report();
    } catch (error) {
      console.error(
        '[PresenceRuntime] report failed; committing locally anyway:',
        error
      );
    }
    await commit();
  })();
}

function runEffects(effects: PresenceEffect[]) {
  const runId = currentRunId;
  const snapshotCtx = ctx;
  if (!runId || !snapshotCtx) return;

  for (const effect of effects) {
    switch (effect.type) {
      case 'ARM_GRACE_DEADLINE':
        clearGraceTimer();
        graceTimer = setTimeout(
          () => dispatch({ type: 'GRACE_DEADLINE' }),
          Math.max(0, effect.at - Date.now())
        );
        break;
      case 'CANCEL_GRACE_DEADLINE':
        clearGraceTimer();
        break;
      case 'SCHEDULE_WARNING_NOTIFICATION':
        safe(() => schedulePresenceWarningNotification(effect.delayMs));
        break;
      case 'CANCEL_WARNING_NOTIFICATION':
        safe(() => cancelPresenceWarningNotification());
        break;
      case 'SCHEDULE_AWAY_REPORT':
      case 'CANCEL_AWAY_REPORT':
        // Implemented in the realtime-fail runtime tasks (6–7).
        break;
      case 'PATCH_LOCK':
        safe(() =>
          updatePhoneLockStatus(
            runId,
            effect.locked,
            useQuestStore.getState().currentLiveActivityId
          )
        );
        break;
      case 'REPORT_FAIL':
        reportThenCommit(
          () =>
            updateQuestRunStatus(
              runId,
              'failed',
              null,
              undefined,
              effect.reason
            ),
          () => useQuestStore.getState().failQuest()
        );
        break;
      case 'REPORT_COMPLETE':
        reportThenCommit(
          // 'watched': the client watched the countdown out — confirm to
          // finalize + award the lock bonus. 'locked': the server already
          // auto-completed on lock-expiry, so no report is needed here. Either
          // way, completeQuest(true) below pulls the awarded rewards via its
          // OWN getQuestRunStatus fetch — a runtime fetch here would be redundant.
          () =>
            effect.source === 'watched'
              ? confirmQuestRun(runId)
              : Promise.resolve(),
          () => useQuestStore.getState().completeQuest(true)
        );
        break;
      case 'PERSIST_SNAPSHOT':
        persistSnapshot(runId, snapshotCtx);
        break;
      default: {
        // Exhaustiveness guard: a future 9th PresenceEffect fails to COMPILE
        // here instead of silently no-opping.
        const _exhaustive: never = effect;
        return _exhaustive;
      }
    }
  }
}

function dispatch(event: PresenceEvent) {
  if (!ctx || !currentRunId) return;
  const { context, effects } = presenceReducer(ctx, event, Date.now());
  ctx = context;
  notify();
  runEffects(effects);
  manageAliveTick();
  if (context.state === 'FAILED' || context.state === 'COMPLETED') {
    clearAllTimers();
  }
}

function deriveConfig(activeQuest: Quest): PresenceConfig {
  return {
    actualStartTime: activeQuest.startTime,
    scheduledEndTime:
      activeQuest.startTime + activeQuest.durationMinutes * 60_000,
  };
}

// (Re)hydrates and starts managing a presence run — called on mount when a
// presence run is already active, and whenever the store shows a new one.
function startPresenceSession(activeQuest: Quest) {
  const runId = activeQuest.questRunId;
  if (!runId) {
    console.warn(
      '[PresenceRuntime] presence run active without a questRunId; cannot manage it'
    );
    return;
  }

  // Tear down any prior session's timers before installing this one. Covers a
  // direct run→run swap (store activeQuest A→B with no null in between), where
  // Run A's grace/completion timers would otherwise leak. This also covers the
  // handleRawSignal race-guard branch, which starts a session via this fn.
  clearAllTimers();

  const config = deriveConfig(activeQuest);
  const now = Date.now();
  const snapshot = getItem<PresenceSnapshot | null>(snapshotKey(runId));

  let context: PresenceContext;
  let effects: PresenceEffect[] = [];
  if (snapshot) {
    ({ context, effects } = rehydratePresence(snapshot, config, now));
  } else {
    context = initPresenceContext(config, now);
  }

  currentRunId = runId;
  ctx = context;
  notify();
  runEffects(effects);

  if (context.state === 'FAILED' || context.state === 'COMPLETED') {
    clearAllTimers();
  } else {
    armCompletionTimer(config.scheduledEndTime);
    manageAliveTick();
  }
}

function endSession() {
  const endedRunId = currentRunId;
  currentRunId = null;
  ctx = null;
  clearAllTimers();
  if (endedRunId) {
    // A run canceled/failed OUTSIDE the machine (e.g. cancelQuest() while AWAY)
    // never emitted CANCEL_WARNING_NOTIFICATION, so the scheduled "hero in
    // danger" warning would fire minutes later for a dead run — cancel it here.
    safe(() => cancelPresenceWarningNotification());
    // Drop the ended run's snapshot so MMKV doesn't accumulate one dead
    // snapshot per finished run forever.
    safeSync(() => removeItem(snapshotKey(endedRunId)));
  }
  notify();
}

/** Discriminator: true only for a presence-enforced active run. */
function isPresenceRun(activeQuest: Quest | null): activeQuest is Quest {
  return !!activeQuest && (activeQuest.enforcement ?? 'lock') === 'presence';
}

// Store-subscription half of lifecycle management (spec F): detects a
// presence run becoming active (or a different one replacing it), or the
// current one disappearing (completed/failed/canceled by other code paths),
// and starts/tears down the session accordingly.
function evaluateStoreState() {
  const s = useQuestStore.getState();

  if (isPresenceRun(s.activeQuest)) {
    if (s.activeQuest.questRunId !== currentRunId) {
      startPresenceSession(s.activeQuest);
    }
  } else if (currentRunId) {
    endSession();
  }
}

type RawSignal =
  | { kind: 'LOCK' }
  | { kind: 'UNLOCK' }
  | { kind: 'APP_STATE'; status: AppStateStatus };

// Dispatch by run kind (spec B): read the store fresh on every raw signal and
// route it to the machine (presence), the legacy timer (coop), or nowhere.
function handleRawSignal(signal: RawSignal) {
  const s = useQuestStore.getState();

  if (isPresenceRun(s.activeQuest)) {
    // Guard against a lock/unlock racing session start (e.g. mount ordering).
    if (!currentRunId || currentRunId !== s.activeQuest.questRunId) {
      startPresenceSession(s.activeQuest);
    }
    switch (signal.kind) {
      case 'LOCK':
        dispatch({ type: 'SCREEN_LOCKED' });
        break;
      case 'UNLOCK':
        dispatch({ type: 'SCREEN_UNLOCKED' });
        break;
      case 'APP_STATE':
        dispatch({
          type: signal.status === 'active' ? 'APP_ACTIVE' : 'APP_BACKGROUND',
        });
        break;
    }
    return;
  }

  const isCoop = !!(s.activeQuest || s.cooperativeQuestRun);
  if (isCoop) {
    switch (signal.kind) {
      case 'LOCK':
        safe(() => QuestTimer.onPhoneLocked());
        break;
      case 'UNLOCK':
        safe(() => QuestTimer.onPhoneUnlocked());
        break;
      case 'APP_STATE':
        // The legacy useLockStateDetection never consumed AppState for coop —
        // forwarding it now would change coop behavior. Do nothing.
        break;
    }
    return;
  }

  // No active run of either kind: ignore everything.
}

function mount() {
  if (appStateSub) return; // already mounted — guard against a stray double-mount

  lockSub = addLockListener('LOCKED', () => handleRawSignal({ kind: 'LOCK' }));
  unlockSub = addLockListener('UNLOCKED', () =>
    handleRawSignal({ kind: 'UNLOCK' })
  );
  appStateSub = AppState.addEventListener('change', (status) => {
    handleRawSignal({ kind: 'APP_STATE', status });
  });

  storeUnsub = useQuestStore.subscribe(evaluateStoreState);

  // Hydrate immediately: a presence run may already be active at mount time
  // (cold start, or navigating back into an in-progress quest).
  evaluateStoreState();
}

function unmount() {
  lockSub?.remove();
  unlockSub?.remove();
  appStateSub?.remove();
  storeUnsub?.();
  lockSub = null;
  unlockSub = null;
  appStateSub = null;
  storeUnsub = null;

  // App-teardown, not run-end: deliberately KEEP the MMKV snapshot (for
  // cold-start rehydration) and any scheduled warning (fires if abandoned).
  clearAllTimers();
  currentRunId = null;
  ctx = null;
}

/**
 * Mount the presence runtime. Call exactly ONCE, at the app root — this
 * replaces the old (doubly-mounted) useLockStateDetection().
 */
export function usePresenceRuntime() {
  useEffect(() => {
    mount();
    return unmount;
  }, []);
}
