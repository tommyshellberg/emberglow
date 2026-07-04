/**
 * Pure presence state machine. NO imports from react-native, native modules,
 * timers, MMKV, or the network — the mobile analogue of the server's
 * quest-presence.service.js purity contract. All I/O is described via the
 * returned `effects`, executed by quest-presence-runtime.ts.
 *
 * Spec: docs/superpowers/specs/2026-07-03-unified-quest-presence-design.md
 */

export const GRACE_MS = 30_000;
export const WARNING_DELAY_MS = 3_000; // warning fires ~3s after leaving so instant switch-backs never see it

export type PresenceState =
  | 'IN_APP'
  | 'LOCKED'
  | 'AWAY'
  | 'FAILED'
  | 'COMPLETED';

export type PresenceEvent =
  | { type: 'APP_ACTIVE' }
  | { type: 'APP_BACKGROUND' }
  | { type: 'SCREEN_LOCKED' }
  | { type: 'SCREEN_UNLOCKED' }
  | { type: 'GRACE_DEADLINE' }
  | { type: 'TIMER_COMPLETE' };

export type PresenceEffect =
  | { type: 'ARM_GRACE_DEADLINE'; at: number }
  | { type: 'CANCEL_GRACE_DEADLINE' }
  | { type: 'SCHEDULE_WARNING_NOTIFICATION'; delayMs: number }
  | { type: 'CANCEL_WARNING_NOTIFICATION' }
  | { type: 'PATCH_LOCK'; locked: boolean }
  | { type: 'REPORT_FAIL'; reason: 'left_app' }
  | { type: 'REPORT_COMPLETE'; lockedMs: number; source: 'watched' | 'locked' }
  | { type: 'PERSIST_SNAPSHOT' };

export interface PresenceConfig {
  actualStartTime: number; // ms epoch — quest start
  scheduledEndTime: number; // ms epoch — quest completion deadline (hard upper bound for locked clipping)
}

export interface PresenceContext extends PresenceConfig {
  state: PresenceState;
  enteredAt: number; // when the current state was entered
  lockedMs: number; // accumulated CLOSED locked segments
  lockedSegmentStart: number | null; // start of the currently-open locked segment (null unless LOCKED)
  graceDeadline: number | null; // armed grace expiry (only when AWAY)
  lastAliveAt: number; // last liveness tick while IN_APP; anchors cold-start crash judgment
}

export type Reduction = { context: PresenceContext; effects: PresenceEffect[] };

export const initPresenceContext = (
  config: PresenceConfig,
  now: number
): PresenceContext => ({
  ...config,
  state: 'IN_APP',
  enteredAt: now,
  lockedMs: 0,
  lockedSegmentStart: null,
  graceDeadline: null,
  lastAliveAt: now,
});

const isTerminal = (s: PresenceState) => s === 'FAILED' || s === 'COMPLETED';

/** Locked ms to credit if the open segment closes at `now`, clipped to scheduledEndTime. */
const closeSegment = (ctx: PresenceContext, now: number): number => {
  if (ctx.lockedSegmentStart == null) return ctx.lockedMs;
  const upper = Math.min(now, ctx.scheduledEndTime);
  return ctx.lockedMs + Math.max(0, upper - ctx.lockedSegmentStart);
};

// Apply a state transition. `patch` carries the new `state` and `enteredAt`
// plus any ledger changes; kept to two params to satisfy max-params.
const enter = (
  ctx: PresenceContext,
  patch: Partial<PresenceContext>
): PresenceContext => ({ ...ctx, ...patch });

// --- terminal builders ---

const complete = (ctx: PresenceContext, now: number): Reduction => {
  const lockedMs = closeSegment(ctx, now);
  const source: 'watched' | 'locked' =
    ctx.lockedSegmentStart != null ? 'locked' : 'watched';
  return {
    context: enter(ctx, {
      state: 'COMPLETED',
      enteredAt: now,
      lockedMs,
      lockedSegmentStart: null,
      graceDeadline: null,
    }),
    effects: [
      { type: 'CANCEL_GRACE_DEADLINE' },
      { type: 'CANCEL_WARNING_NOTIFICATION' },
      { type: 'REPORT_COMPLETE', lockedMs, source },
      { type: 'PERSIST_SNAPSHOT' },
    ],
  };
};

const fail = (ctx: PresenceContext, now: number): Reduction => ({
  context: enter(ctx, { state: 'FAILED', enteredAt: now, graceDeadline: null }),
  effects: [
    { type: 'CANCEL_WARNING_NOTIFICATION' },
    { type: 'REPORT_FAIL', reason: 'left_app' },
    { type: 'PERSIST_SNAPSHOT' },
  ],
});

/**
 * Deadline-first, chronological evaluation. Runs before any event is honored as
 * a state signal. When both the quest end and the grace deadline lie in the
 * past, the EARLIER one wins (quest end wins ties → COMPLETED, the user-favorable
 * resolution). graceDeadline is only ever set while AWAY.
 * Returns null when no deadline has passed.
 */
const evaluateDeadlines = (
  ctx: PresenceContext,
  now: number
): Reduction | null => {
  const endPassed = now >= ctx.scheduledEndTime;
  const gracePassed = ctx.graceDeadline != null && now >= ctx.graceDeadline;
  if (endPassed && gracePassed) {
    return ctx.scheduledEndTime <= (ctx.graceDeadline as number)
      ? complete(ctx, now)
      : fail(ctx, now);
  }
  if (endPassed) return complete(ctx, now);
  if (gracePassed) return fail(ctx, now);
  return null;
};

// --- live-state signal transitions (after deadline eval) ---

const toInApp = (ctx: PresenceContext, now: number): Reduction => {
  const effects: PresenceEffect[] = [
    { type: 'CANCEL_GRACE_DEADLINE' },
    { type: 'CANCEL_WARNING_NOTIFICATION' },
  ];
  let lockedMs = ctx.lockedMs;
  if (ctx.state === 'LOCKED') {
    // APP_ACTIVE absorbed a missed SCREEN_UNLOCKED: close the segment + report unlock.
    lockedMs = closeSegment(ctx, now);
    effects.push({ type: 'PATCH_LOCK', locked: false });
  }
  effects.push({ type: 'PERSIST_SNAPSHOT' });
  return {
    context: enter(ctx, {
      state: 'IN_APP',
      enteredAt: now,
      lockedMs,
      lockedSegmentStart: null,
      graceDeadline: null,
      lastAliveAt: now,
    }),
    effects,
  };
};

const toAway = (ctx: PresenceContext, now: number): Reduction => ({
  context: enter(ctx, {
    state: 'AWAY',
    enteredAt: now,
    graceDeadline: now + GRACE_MS,
  }),
  effects: [
    { type: 'ARM_GRACE_DEADLINE', at: now + GRACE_MS },
    { type: 'SCHEDULE_WARNING_NOTIFICATION', delayMs: WARNING_DELAY_MS },
    { type: 'PERSIST_SNAPSHOT' },
  ],
});

const toAwayFromLock = (ctx: PresenceContext, now: number): Reduction => ({
  context: enter(ctx, {
    state: 'AWAY',
    enteredAt: now,
    lockedMs: closeSegment(ctx, now),
    lockedSegmentStart: null,
    graceDeadline: now + GRACE_MS,
  }),
  effects: [
    { type: 'PATCH_LOCK', locked: false },
    { type: 'ARM_GRACE_DEADLINE', at: now + GRACE_MS },
    { type: 'SCHEDULE_WARNING_NOTIFICATION', delayMs: WARNING_DELAY_MS },
    { type: 'PERSIST_SNAPSHOT' },
  ],
});

const toLocked = (ctx: PresenceContext, now: number): Reduction => ({
  context: enter(ctx, {
    state: 'LOCKED',
    enteredAt: now,
    lockedSegmentStart: now,
    graceDeadline: null,
  }),
  effects: [
    { type: 'CANCEL_GRACE_DEADLINE' },
    { type: 'CANCEL_WARNING_NOTIFICATION' },
    { type: 'PATCH_LOCK', locked: true },
    { type: 'PERSIST_SNAPSHOT' },
  ],
});

const noop = (ctx: PresenceContext): Reduction => ({
  context: ctx,
  effects: [],
});

export const presenceReducer = (
  ctx: PresenceContext,
  event: PresenceEvent,
  now: number
): Reduction => {
  if (isTerminal(ctx.state)) return noop(ctx);

  // 1. Deadline-first: armed deadlines are checked against `now` before the event
  //    is honored as a state signal. A late APP_ACTIVE in AWAY past grace FAILS.
  const byDeadline = evaluateDeadlines(ctx, now);
  if (byDeadline) return byDeadline;

  // 2. Honor the event.
  switch (event.type) {
    case 'APP_ACTIVE':
      // "APP_ACTIVE wins on state, never on deadlines" — after deadline eval, force IN_APP.
      return toInApp(ctx, now);
    case 'APP_BACKGROUND':
      return ctx.state === 'IN_APP' ? toAway(ctx, now) : noop(ctx);
    case 'SCREEN_LOCKED':
      return ctx.state === 'LOCKED' ? noop(ctx) : toLocked(ctx, now);
    case 'SCREEN_UNLOCKED':
      return ctx.state === 'LOCKED' ? toAwayFromLock(ctx, now) : noop(ctx);
    case 'GRACE_DEADLINE':
    case 'TIMER_COMPLETE':
      // Their effect is realized entirely by evaluateDeadlines above; if no
      // deadline had passed, the timer fired early — ignore.
      return noop(ctx);
    default:
      return noop(ctx);
  }
};

/** The MMKV-persisted snapshot the runtime writes on every transition. */
export interface PresenceSnapshot {
  state: PresenceState;
  enteredAt: number;
  lockedMs: number;
  lastAliveAt: number;
}

/**
 * Cold-start re-judgment. Rebuilds a context with the correct armed deadlines,
 * then runs the SAME evaluateDeadlines used for warm returns.
 *  - LOCKED snapshot: the app died locked (force-quitting requires unlocking) —
 *    innocent. Reopen the segment at enteredAt; if the quest end fell in the
 *    locked span → COMPLETED (server auto-completed), else resume IN_APP with an
 *    unlock PATCH (relaunch means the phone is now unlocked/foregrounded).
 *  - IN_APP/AWAY snapshot: effective grace deadline = max(enteredAt, lastAliveAt)
 *    + GRACE_MS. For an IN_APP crash, lastAliveAt is within a tick of the crash,
 *    so the clock starts at the crash, not at state entry.
 */
export const rehydratePresence = (
  snapshot: PresenceSnapshot,
  config: PresenceConfig,
  now: number
): Reduction => {
  const restored: PresenceContext = {
    ...config,
    state: snapshot.state,
    enteredAt: snapshot.enteredAt,
    lockedMs: snapshot.lockedMs,
    lockedSegmentStart: snapshot.state === 'LOCKED' ? snapshot.enteredAt : null,
    graceDeadline:
      snapshot.state === 'IN_APP' || snapshot.state === 'AWAY'
        ? Math.max(snapshot.enteredAt, snapshot.lastAliveAt) + GRACE_MS
        : null,
    lastAliveAt: snapshot.lastAliveAt,
  };

  const byDeadline = evaluateDeadlines(restored, now);
  if (byDeadline) return byDeadline;

  // No deadline elapsed → resume live. Cold start always relaunches foregrounded
  // and (for a prior LOCKED) unlocked, so resume IN_APP via the same APP_ACTIVE path.
  return toInApp(restored, now);
};
