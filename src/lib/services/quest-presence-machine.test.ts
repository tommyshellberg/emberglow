import {
  initPresenceContext,
  presenceReducer,
  type PresenceContext,
} from './quest-presence-machine';

const START = 1_000_000; // arbitrary epoch ms
const DURATION_MS = 30 * 60 * 1000;
const END = START + DURATION_MS;

const base = (over: Partial<PresenceContext> = {}): PresenceContext => ({
  ...initPresenceContext({ actualStartTime: START, scheduledEndTime: END }, START),
  ...over,
});

const has = (effects: { type: string }[], t: string) => effects.some((e) => e.type === t);

describe('initPresenceContext', () => {
  it('starts IN_APP with a clean ledger', () => {
    const ctx = initPresenceContext({ actualStartTime: START, scheduledEndTime: END }, START);
    expect(ctx.state).toBe('IN_APP');
    expect(ctx.enteredAt).toBe(START);
    expect(ctx.lockedMs).toBe(0);
    expect(ctx.lockedSegmentStart).toBeNull();
    expect(ctx.graceDeadline).toBeNull();
    expect(ctx.lastAliveAt).toBe(START);
  });
});

describe('IN_APP transitions', () => {
  it('APP_BACKGROUND → AWAY, arms grace + schedules warning', () => {
    const t = START + 60_000;
    const { context, effects } = presenceReducer(base(), { type: 'APP_BACKGROUND' }, t);
    expect(context.state).toBe('AWAY');
    expect(context.graceDeadline).toBe(t + 30_000);
    expect(has(effects, 'ARM_GRACE_DEADLINE')).toBe(true);
    expect(has(effects, 'SCHEDULE_WARNING_NOTIFICATION')).toBe(true);
    expect(has(effects, 'PERSIST_SNAPSHOT')).toBe(true);
  });

  it('SCREEN_LOCKED → LOCKED, opens a segment, PATCHes lock:true', () => {
    const t = START + 60_000;
    const { context, effects } = presenceReducer(base(), { type: 'SCREEN_LOCKED' }, t);
    expect(context.state).toBe('LOCKED');
    expect(context.lockedSegmentStart).toBe(t);
    expect(effects).toContainEqual({ type: 'PATCH_LOCK', locked: true });
  });

  it('SCREEN_UNLOCKED is a no-op when not locked', () => {
    const { context, effects } = presenceReducer(base(), { type: 'SCREEN_UNLOCKED' }, START + 5);
    expect(context.state).toBe('IN_APP');
    expect(effects).toEqual([]);
  });
});

describe('LOCKED transitions & accounting', () => {
  const locked = (segStart: number) =>
    base({ state: 'LOCKED', enteredAt: segStart, lockedSegmentStart: segStart });

  it('SCREEN_UNLOCKED → AWAY: closes the segment, credits lockedMs, PATCHes lock:false, re-arms grace', () => {
    const segStart = START + 60_000;
    const t = segStart + 5 * 60_000; // 5 min locked
    const { context, effects } = presenceReducer(locked(segStart), { type: 'SCREEN_UNLOCKED' }, t);
    expect(context.state).toBe('AWAY');
    expect(context.lockedMs).toBe(5 * 60_000);
    expect(context.lockedSegmentStart).toBeNull();
    expect(context.graceDeadline).toBe(t + 30_000);
    expect(effects).toContainEqual({ type: 'PATCH_LOCK', locked: false });
    expect(has(effects, 'ARM_GRACE_DEADLINE')).toBe(true);
  });

  it('APP_ACTIVE from LOCKED (missed unlock signal) → IN_APP, still closes the segment + PATCHes lock:false', () => {
    const segStart = START + 60_000;
    const t = segStart + 2 * 60_000;
    const { context, effects } = presenceReducer(locked(segStart), { type: 'APP_ACTIVE' }, t);
    expect(context.state).toBe('IN_APP');
    expect(context.lockedMs).toBe(2 * 60_000);
    expect(effects).toContainEqual({ type: 'PATCH_LOCK', locked: false });
  });

  it('APP_BACKGROUND while LOCKED is ignored (legitimately off-app)', () => {
    const segStart = START + 60_000;
    const { context, effects } = presenceReducer(locked(segStart), { type: 'APP_BACKGROUND' }, segStart + 1000);
    expect(context.state).toBe('LOCKED');
    expect(effects).toEqual([]);
  });
});

describe('AWAY transitions', () => {
  const away = (enteredAt: number) =>
    base({ state: 'AWAY', enteredAt, graceDeadline: enteredAt + 30_000 });

  it('APP_ACTIVE within grace → IN_APP (rescue), cancels grace + warning', () => {
    const enteredAt = START + 60_000;
    const t = enteredAt + 10_000; // within 30s
    const { context, effects } = presenceReducer(away(enteredAt), { type: 'APP_ACTIVE' }, t);
    expect(context.state).toBe('IN_APP');
    expect(context.graceDeadline).toBeNull();
    expect(has(effects, 'CANCEL_GRACE_DEADLINE')).toBe(true);
    expect(has(effects, 'CANCEL_WARNING_NOTIFICATION')).toBe(true);
  });

  it('SCREEN_LOCKED from AWAY → LOCKED (away time is not credited as locked)', () => {
    const enteredAt = START + 60_000;
    const t = enteredAt + 10_000;
    const { context } = presenceReducer(away(enteredAt), { type: 'SCREEN_LOCKED' }, t);
    expect(context.state).toBe('LOCKED');
    expect(context.lockedSegmentStart).toBe(t); // segment starts at lock, not at away-entry
    expect(context.lockedMs).toBe(0);
  });
});

describe('terminal states are absorbing', () => {
  it('ignores events once FAILED', () => {
    const ctx = base({ state: 'FAILED' });
    const { context, effects } = presenceReducer(ctx, { type: 'APP_ACTIVE' }, END + 1);
    expect(context.state).toBe('FAILED');
    expect(effects).toEqual([]);
  });
});

describe('deadline-first chronological evaluation', () => {
  it('TIMER_COMPLETE while IN_APP → COMPLETED, source watched (client will confirm)', () => {
    const { context, effects } = presenceReducer(base(), { type: 'TIMER_COMPLETE' }, END);
    expect(context.state).toBe('COMPLETED');
    expect(effects).toContainEqual({ type: 'REPORT_COMPLETE', lockedMs: 0, source: 'watched' });
  });

  it('quest end while LOCKED → COMPLETED, source locked, credits the clipped tail', () => {
    const segStart = END - 10 * 60_000; // locked for the final 10 min...
    const ctx = base({ state: 'LOCKED', enteredAt: segStart, lockedSegmentStart: segStart });
    // ...evaluated late, well past END: the tail is clipped to END (10 min), not to `now`.
    const { context, effects } = presenceReducer(ctx, { type: 'APP_ACTIVE' }, END + 5 * 60_000);
    expect(context.state).toBe('COMPLETED');
    expect(context.lockedMs).toBe(10 * 60_000);
    expect(effects).toContainEqual({ type: 'REPORT_COMPLETE', lockedMs: 10 * 60_000, source: 'locked' });
  });

  it('late APP_ACTIVE in AWAY past grace → FAILED (never rescues)', () => {
    const enteredAt = START + 60_000;
    const ctx = base({ state: 'AWAY', enteredAt, graceDeadline: enteredAt + 30_000 });
    const { context, effects } = presenceReducer(ctx, { type: 'APP_ACTIVE' }, enteredAt + 5 * 60_000);
    expect(context.state).toBe('FAILED');
    expect(effects).toContainEqual({ type: 'REPORT_FAIL', reason: 'left_app' });
  });

  it('chronological: grace before quest end → FAILED', () => {
    // abandoned at minute 2 of a 30-min quest; evaluated after both are long past
    const enteredAt = START + 2 * 60_000;
    const ctx = base({ state: 'AWAY', enteredAt, graceDeadline: enteredAt + 30_000 });
    const { context } = presenceReducer(ctx, { type: 'APP_ACTIVE' }, END + 60_000);
    expect(context.state).toBe('FAILED'); // grace (00:02:30) came before end (00:30:00)
  });

  it('chronological: quest end before grace → COMPLETED (crash 10s before a long quest finished)', () => {
    // AWAY entered 10s before END; grace would expire 20s AFTER END
    const enteredAt = END - 10_000;
    const ctx = base({ state: 'AWAY', enteredAt, graceDeadline: enteredAt + 30_000 });
    const { context } = presenceReducer(ctx, { type: 'APP_ACTIVE' }, END + 5 * 60_000);
    expect(context.state).toBe('COMPLETED'); // end came before grace
  });

  it('APP_ACTIVE within grace still rescues (deadline eval finds nothing passed)', () => {
    const enteredAt = START + 60_000;
    const ctx = base({ state: 'AWAY', enteredAt, graceDeadline: enteredAt + 30_000 });
    const { context } = presenceReducer(ctx, { type: 'APP_ACTIVE' }, enteredAt + 15_000);
    expect(context.state).toBe('IN_APP');
  });
});
