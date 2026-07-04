# Unified Quest Presence — Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the solo quest flow in the Emberglow mobile app with a unified *presence* model — every solo quest starts immediately on tap onto a live active-quest screen; staying in-app keeps it alive at 1× XP, locking the phone continues it in hard mode for bonus XP, leaving the app opens a 30-second grace countdown, and overstaying fails it — all pass/fail decisions delegated to a pure, exhaustively-tested state machine.

**Architecture:** A pure TypeScript reducer `presenceReducer(context, event, now) → { context, effects }` (zero React Native / native / timer imports) is the single source of every pass/fail decision — mirroring the server's `quest-presence.service.js` purity contract. A single runtime (mounted in exactly **one** place, fixing today's double-mount of `useLockStateDetection`) normalizes platform signals (RN `AppState` + the `modules/lock-state` native module) into machine events, executes the machine's returned effects (arm/cancel grace deadline, schedule/cancel warning notification, PATCH lock status, report fail/complete, persist snapshot), and persists `{state, enteredAt, lockedMs, lastAliveAt}` to MMKV every transition. `QuestTimer` slims to orchestration (create run, `/begin`, PATCH lock, iOS Live Activity, Android foreground service) — it no longer decides outcomes. The new `active-quest.tsx` screen renders machine-derived view state via `useQuestPresence()` and never computes a decision. **Presence is a property of the *run*, not the quest template** — the template `mode` (`story`/`custom`) is untouched.

**Compat boundary:** Solo quests are fully replaced (no toggle — per the spec's phased-store-rollout strategy). **Cooperative quests are out of scope (phase B, post issue-25 merge)** and must behave byte-identically: the consolidated runtime dispatches an active *solo presence* run to the machine and an active *cooperative* run to the legacy `QuestTimer.onPhoneLocked/onPhoneUnlocked` coop handlers, which stay unchanged.

**Tech Stack:** Expo SDK `~52.0.47`, React Native `0.76.9`, React `18.3.1`, `@tanstack/react-query@^5`, `zustand@^4` + `react-native-mmkv@~3.1.0` persistence, `expo-audio` (new — Task 1 gate), `expo-keep-awake` (new — Task 1 gate), `expo-av@~15.0.2` (retained for `StoryNarration`, not migrated), Jest `^29` + `jest-expo@~52` + `@testing-library/react-native@^12` + `tdd-guard-jest`. Native: Swift (iOS `modules/lock-state`), Kotlin (Android `modules/lock-state`, unchanged).

**Spec:** `docs/superpowers/specs/2026-07-03-unified-quest-presence-design.md` — **currently committed on branch `chore/lint-ci-green` (commits `7a7f0e8..15ef1b6`), not yet on `main`.** This plan branch (`feat/unified-quest-presence-mobile`) was cut from `main` and intentionally does not duplicate the spec; read it from `chore/lint-ci-green`, or reconcile that branch onto `main` first (see Pre-flight).

**Server contract (LOCKED):** The server half shipped in PR #35 (`tommyshellberg/emberglow-server`, branch `worktree-feat-unified-quest-presence-server`, 502 tests green). This plan builds the client against that exact contract — see Pre-flight for the endpoint table.

---

## Execution progress (last updated 2026-07-04)

**Tasks 1–6 COMPLETE**, committed on `feat/unified-quest-presence-mobile` (branched from `main`). Foundational pure/API layer done — 843 lines of tested code; every new file jest-green + tsc-clean + eslint-clean.

- Task 1 — deps gate PASS (`e2f37e3`): `expo-audio@~0.3.5`, `expo-keep-awake@~14.0.3` verified SDK-52-compatible.
- Tasks 2/3/4 (`5794c02`, `a6be0e2`, `7e3de1f`) — `quest-presence-machine.ts` pure reducer (22 tests; zero imports).
- Task 5 (`7823dfc`) — `presence-forecast.ts` (5 tests).
- Task 6 (`5a2cd66`) — `quest-run-service.ts` begin/confirm/left_app (10 tests).

**Next: Task 7.** Then 8–15 (integration/UI/native), 16 (compat sweep), 17 (device-QA — needs PR #35 merged).

**Execution environment notes — a fresh session MUST know these:**
1. Run everything from the worktree `.worktrees/feat/unified-quest-presence-mobile`. `pnpm install` is done; `.env.*` were copied from the main checkout (gitignored — not present in a fresh worktree).
2. **Verification gates** (see "Verification gates" section below): jest-green + new-files-individually-tsc-clean + eslint-clean. `main`'s `tsc` baseline has ~367 pre-existing errors — do NOT chase global `type-check`/`check-all` green; for a *modified* file, only ensure you add no NEW tsc/eslint errors.
3. **eslint**: the worktree nests inside the main repo, so plain eslint collides on the `prettier` plugin. Lint source files via `pnpm exec eslint --no-eslintrc -c .eslintrc.js --ext .ts <file>` (`.test.ts` reports "ignored by default" under this flag — expected/benign). Always `pnpm exec prettier --write <files>` before committing.
4. This plan lives under a **gitignored `docs/`** — commit plan edits with `git add -f`.
5. Commits must NOT include any `Co-Authored-By`/Claude-attribution trailer (repo owner's rule).

---

## Pre-flight (read before touching anything)

- [ ] **Read the design spec in full.** `docs/superpowers/specs/2026-07-03-unified-quest-presence-design.md` on `chore/lint-ci-green`. The spec's decisions are **final** — do not re-litigate settled trade-offs: heartbeats-rejected (claim-based completion instead), deliberate lock-time over-credit on both client and server (do not "fix" one side only), no iOS background-audio entitlement in v1 (music stops on lock), full-replacement rollout (no in-app A/B flag). This plan implements the spec; it does not redesign it.

- [ ] **Confirm the spec + this plan will land on `main` together.** The spec commits sit on `chore/lint-ci-green` (a CI chore branch). Before this feature merges, ensure the spec is on `main` (via that branch merging, or cherry-pick). Track this as a merge-ordering note; it does not block writing/executing the code.

- [ ] **Read the server plan for the locked API shape.** `unquest-server` repo: `docs/superpowers/plans/2026-07-03-unified-quest-presence-server.md`. The client builds against exactly these endpoints (all under the version-prefixed base URL — the mobile axios client already includes `/v1`, so client call strings are bare `/quest-runs/...`):

  | Client trigger | Method + path | Body | Server behavior |
  |---|---|---|---|
  | Start tap | `POST /quest-runs/` | `{ quest }` or `{ questTemplateId }` | create run (existing; embeds `quest`, `participants`) |
  | Start tap (2nd call) | `PATCH /quest-runs/:id/begin` | `{}` | activate solo run: `status:'active'`, `enforcement:'presence'`, sets `actualStartTime`+`scheduledEndTime`, schedules completion. Returns the run. |
  | machine `SCREEN_LOCKED`/`UNLOCKED` | `PATCH /quest-runs/:id/phone-lock-status` | `{ locked: boolean }` | presence: `locked:true` opens a server-timestamped segment; `locked:false` accumulates `participant.lockedDurationMs` (never fails). |
  | machine `TIMER_COMPLETE` while foregrounded | `PATCH /quest-runs/:id/confirm` | `{}` | completes a presence run from `awaiting_confirmation`, OR from `active` iff server `now ≥ scheduledEndTime` (races the completion job). Awards `finalXP` incl. `participant.rewards.lockBonus`. 400 for lock runs / too-early. |
  | machine grace-expiry / abandonment | `PATCH /quest-runs/:id/status` | `{ status:'failed', failureReason:'left_app' }` | valid from `active` AND `awaiting_confirmation`; cancels any pending completion job. |
  | results screen | (reads) `GET /quest-runs/:id` | — | `participant.rewards.lockBonus` for the results display. |

  Run status lifecycle (server): `pending → active → awaiting_confirmation → completed | failed`. Server owns final XP: `finalXP = ceil(baseXP × (multiplier + 0.5 × lockedFraction))`, `lockedFraction = clamp(lockedDurationMs / totalDurationMs, 0, 1)`, segments clipped to `scheduledEndTime`. **The client only forecasts** ("62 XP · up to 93 if locked"); it never computes the awarded value.

- [ ] **PR #35 is not yet merged.** The plan can be executed now (the API shape is final), but any *live* integration test (real HTTP against a running server) needs that branch merged or running locally against your dev DB. Unit/component tests mock the client and do not need it. Where a task calls for live verification, it is flagged; otherwise mock.

- [ ] **Resolve the open analytics question (spec "Open items").** Confirm which pipeline the experiment metrics flow through. `posthog-react-native@^4.1.4` is installed (`package.json:96`) — almost certainly the pipeline. **Decision needed before shipping:** are the four experiment metrics (solo completion rate, quests/user/week, D7 retention, locked-fraction distribution) captured by existing PostHog events, or is new instrumentation required? Instrumentation is **not** a task in this plan — surface the answer here and file a follow-up if new events are needed.

- [ ] **Baseline established (2026-07-04).** From the worktree root: `pnpm install` (done), plus `.env.*` carried over from the main checkout so the Expo toolchain runs. Baseline measured: **jest is fully green — 112 suites, 1312 passing, 3 skipped, 0 failures** — but `tsc --noemit` has **367 pre-existing errors across ~80 files** on `main` (and 436 on `chore/lint-ci-green`). This is accumulated type debt that predates and is out of scope for this feature; `pnpm check-all` cannot pass on this repo today. See **Verification gates** below for the adopted per-task gate.

## Compat invariant (governs every task)

**Cooperative quests are untouched.** The cooperative flow — `QuestTimer.onPhoneLocked`/`onPhoneUnlocked` coop branches (`quest-timer.ts:377-514`, `:867-877`), `cooperative-pending-quest.tsx`, `cooperative-quest-ready.tsx`, the lobby, and their tests — must behave byte-identically at every commit. The presence machine and runtime govern **solo** runs only. The single consolidated runtime dispatches by run kind: an active solo presence run → the machine; an active cooperative run → the legacy `QuestTimer` coop handlers. If a change would force editing a cooperative test, stop and reconsider — the seam is wrong, not the test.

**The machine is pure.** `quest-presence-machine.ts` imports nothing from `react-native`, native modules, timers, MMKV, or the network. If a task adds such an import to the machine file, the design is wrong. All I/O lives in the runtime, which the machine describes via returned `effects`.

**Presence is a run property.** Add `enforcement` to the run-level `Quest` type only (`src/store/types.ts:50-58`). Do **not** add a presence value to the template `mode` enums (`story`/`custom`) in `src/store/types.ts` or `src/api/quest/types.ts`. `getQuestModeLabel` (`src/lib/utils/quest-utils.ts:143`) is orthogonal and unchanged — a presence run still has `mode: 'story' | 'custom'`.

---

## Verification gates (repo baseline reality — adopted 2026-07-04)

`pnpm check-all`/`pnpm type-check` are **not** usable green gates on this repo (367 pre-existing `tsc` errors, out of scope). Each task is instead verified by:

1. **`pnpm test -- <the task's test file(s)>` → GREEN** (the primary TDD signal; jest compiles with babel so it is reliable here). The full `pnpm test` stays green (1312 passing) as the compat gate.
2. **Every NEW file this task creates must be individually `tsc`-clean** — it must not appear in `pnpm type-check`'s error output. Check with: `pnpm type-check 2>&1 | grep "<new/file/path>"` → no matches. (New presence code is written type-clean; we do not add to the debt.)
3. **`pnpm lint <changed files>` → clean** for the files the task touches.

Do **not** attempt to make global `type-check`/`check-all` pass. When a task's steps below say "run `pnpm type-check`", interpret it as gate #2 (the new files are clean), not "zero errors globally."

---

## File Structure

**New files:**
- `src/lib/services/quest-presence-machine.ts` — the pure reducer + types (`PresenceState`, `PresenceEvent`, `PresenceEffect`, `PresenceContext`), `initPresenceContext`, `presenceReducer`, `rehydratePresence`. No RN/native/timer/MMKV/network imports.
- `src/lib/services/quest-presence-machine.test.ts` — exhaustive table-driven Jest tests (zero native mocks).
- `src/lib/services/presence-forecast.ts` — pure XP forecast + live-multiplier helpers (client forecast only).
- `src/lib/services/presence-forecast.test.ts` — table tests.
- `src/lib/services/quest-presence-runtime.ts` — the single runtime: normalizes AppState + lock-state → events, executes effects, persists the MMKV snapshot, dispatches coop → legacy. Exposes `mountPresenceRuntime()` / imperative API consumed by the hook.
- `src/lib/services/quest-presence-runtime.test.ts` — runtime tests with mocked lock-state / AppState / timers / services.
- `src/lib/hooks/useQuestPresence.ts` — read-only hook exposing machine-derived view state to the screen.
- `src/lib/hooks/useQuestPresence.test.tsx` — hook test.
- `src/lib/services/quest-audio.service.ts` — `expo-audio` ambient loop over the existing `audio-cache.service`; play on IN_APP, fade on leave, mute persists.
- `src/lib/services/quest-audio.service.test.ts` — service tests (expo-audio mocked).
- `src/app/active-quest.tsx` — the active-quest screen; renders `useQuestPresence()`.
- `src/app/active-quest/components/campfire-ambience.tsx`, `journey-progress-bar.tsx`, `countdown-display.tsx`, `presence-info-strip.tsx`, `presence-footer.tsx`, `ambient-music-pill.tsx` — screen components.
- `src/app/active-quest.test.tsx` + co-located `*.test.tsx` per component.

**Modified files:**
- `src/lib/services/quest-run-service.ts` — add `beginQuestRun`, `confirmQuestRun`; extend `updateQuestRunStatus` with `failureReason`; widen `QuestRunResponse.status` + `QuestRunStatus`.
- `src/store/types.ts:50-58` — add `enforcement?: 'presence' | 'lock'` to the run-level `Quest` type.
- `src/store/quest-store.ts:810-833` — exempt a presence `activeQuest` from the rehydrate stale-clear.
- `src/lib/services/quest-timer.ts` — slim to orchestration: one immediate presence start (create + `/begin`), delegate solo pass/fail to the machine/runtime, keep coop paths unchanged, merge `prepareQuest` + lock-gated start for solo.
- `src/lib/hooks/useLockStateDetection.ts` — becomes (or is superseded by) the single runtime mount; delete the second mount.
- `src/app/_layout.tsx:388-389` — keep exactly one runtime mount here (root already owns the app-wide `AppState` listener). Register `<Stack.Screen name="active-quest" />` (~`:413`).
- `src/app/(app)/_layout.tsx:61-62` — **remove** the duplicate `useLockStateDetection()` mount.
- `src/lib/navigation/navigation-state-resolver.ts` — add `active-quest` to `NavigationTarget` (`:9-19`), add `activeQuest` to the snapshot (`:32-41`) + subscription (`:50-65`), add the `activeQuest → active-quest` case in Priority 2 (`~:153`).
- `src/app/navigation-gate.tsx` — add `case 'active-quest'` before the `never` exhaustiveness check (`:85`).
- `modules/lock-state/ios/LockStateModule.swift:13-29` — replace background/foreground observers with protected-data observers.

**Untouched on purpose:** `modules/lock-state/android/.../LockStateModule.kt` (already true lock via `ACTION_SCREEN_OFF`/`ACTION_USER_PRESENT`), `src/components/StoryNarration.tsx` + `expo-av` (not migrated), `perk` / `getQuestModeLabel` logic, all cooperative-quest code and tests, `audio-cache.service.ts` (reused as-is by the new audio service).

---

## Task 1: Dependency gate — `expo-audio` + `expo-keep-awake` on SDK ~52 (BLOCKING)

This gates everything else, exactly as the spec's "Open items" direct: `expo-audio` shipped as a new package around SDK 52 and may be preview/experimental. Resolve availability before writing a line of feature code.

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Attempt the SDK-pinned install**

Run: `pnpm expo install expo-audio expo-keep-awake`

`expo install` selects the version compatible with the pinned SDK (`~52.0.47`) rather than latest. Capture the resolved versions it prints.

- [ ] **Step 2: Decision gate — is `expo-audio` supported on SDK 52?**

Run: `npx expo-doctor@latest` and inspect the resolved `expo-audio` version.

- **If `expo-audio` resolves to a real SDK-52-compatible version** (expo-doctor clean, no "expected version" warning): proceed to Step 3.
- **If it requires SDK 53+** (expo-doctor flags a version mismatch, or install pulls a version whose peer `expo` range excludes `~52.0.47`): **STOP.** Do not proceed with this plan. Escalate to the human with two options, per the spec: (a) sequence this effort behind an Expo SDK 52→53 upgrade, or (b) scope the upgrade into this plan as new Task 0. Record expo-doctor's exact output. This re-sequences the whole effort and is a human decision.

- [ ] **Step 3: Smoke-verify both packages import and type-check**

Create a throwaway `src/lib/services/__expo-audio-smoke.ts`:

```ts
// TEMPORARY — deleted in Step 5. Verifies the new deps resolve + type-check on SDK 52.
import { useKeepAwake } from 'expo-keep-awake';
import { createAudioPlayer } from 'expo-audio';

export const __smoke = { useKeepAwake, createAudioPlayer };
```

Run: `pnpm type-check`
Expected: PASS — both symbols resolve. (If `expo-audio`'s API surface differs from `createAudioPlayer`/`useAudioPlayer`, note the actual exported API here; Task 14 depends on it.)

- [ ] **Step 4: Confirm the jest transform tolerates the new native modules**

Run: `pnpm test -- src/lib/storage.tsx` (any existing passing test) to confirm `jest-expo`'s `transformIgnorePatterns` still transpiles with the new deps installed.
Expected: PASS.

- [ ] **Step 5: Delete the smoke file and commit the deps**

```bash
rm src/lib/services/__expo-audio-smoke.ts
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add expo-audio and expo-keep-awake (SDK 52 verified)"
```

Record the resolved `expo-audio` API (player creation, `.play()`/`.pause()`/`.volume`/looping, teardown) in a comment at the top of Task 14 before implementing it.

---

## Task 2: Presence machine — states, transitions & locked-time accounting

The TDD core. A pure reducer with **zero** RN/native/timer imports. Start with the state table (transitions + `lockedMs`); deadlines and cold-start follow in Tasks 3–4.

**Files:**
- Create: `src/lib/services/quest-presence-machine.ts`
- Test: `src/lib/services/quest-presence-machine.test.ts`

- [ ] **Step 1: Write the failing tests (state table + lockedMs)**

Create `src/lib/services/quest-presence-machine.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify RED**

Run: `pnpm test -- src/lib/services/quest-presence-machine.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the machine (transitions + accounting; deadline eval stubbed to null)**

Create `src/lib/services/quest-presence-machine.ts`:

```ts
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

export type PresenceState = 'IN_APP' | 'LOCKED' | 'AWAY' | 'FAILED' | 'COMPLETED';

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

export const initPresenceContext = (config: PresenceConfig, now: number): PresenceContext => ({
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

const enter = (
  ctx: PresenceContext,
  state: PresenceState,
  now: number,
  patch: Partial<PresenceContext> = {}
): PresenceContext => ({ ...ctx, state, enteredAt: now, ...patch });

// --- terminal builders ---

const complete = (ctx: PresenceContext, now: number): Reduction => {
  const lockedMs = closeSegment(ctx, now);
  const source: 'watched' | 'locked' = ctx.lockedSegmentStart != null ? 'locked' : 'watched';
  return {
    context: enter(ctx, 'COMPLETED', now, { lockedMs, lockedSegmentStart: null, graceDeadline: null }),
    effects: [
      { type: 'CANCEL_GRACE_DEADLINE' },
      { type: 'CANCEL_WARNING_NOTIFICATION' },
      { type: 'REPORT_COMPLETE', lockedMs, source },
      { type: 'PERSIST_SNAPSHOT' },
    ],
  };
};

const fail = (ctx: PresenceContext, now: number): Reduction => ({
  context: enter(ctx, 'FAILED', now, { graceDeadline: null }),
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
const evaluateDeadlines = (ctx: PresenceContext, now: number): Reduction | null => {
  const endPassed = now >= ctx.scheduledEndTime;
  const gracePassed = ctx.graceDeadline != null && now >= ctx.graceDeadline;
  if (endPassed && gracePassed) {
    return ctx.scheduledEndTime <= (ctx.graceDeadline as number) ? complete(ctx, now) : fail(ctx, now);
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
    context: enter(ctx, 'IN_APP', now, {
      lockedMs,
      lockedSegmentStart: null,
      graceDeadline: null,
      lastAliveAt: now,
    }),
    effects,
  };
};

const toAway = (ctx: PresenceContext, now: number): Reduction => ({
  context: enter(ctx, 'AWAY', now, { graceDeadline: now + GRACE_MS }),
  effects: [
    { type: 'ARM_GRACE_DEADLINE', at: now + GRACE_MS },
    { type: 'SCHEDULE_WARNING_NOTIFICATION', delayMs: WARNING_DELAY_MS },
    { type: 'PERSIST_SNAPSHOT' },
  ],
});

const toAwayFromLock = (ctx: PresenceContext, now: number): Reduction => ({
  context: enter(ctx, 'AWAY', now, {
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
  context: enter(ctx, 'LOCKED', now, { lockedSegmentStart: now, graceDeadline: null }),
  effects: [
    { type: 'CANCEL_GRACE_DEADLINE' },
    { type: 'CANCEL_WARNING_NOTIFICATION' },
    { type: 'PATCH_LOCK', locked: true },
    { type: 'PERSIST_SNAPSHOT' },
  ],
});

const noop = (ctx: PresenceContext): Reduction => ({ context: ctx, effects: [] });

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
```

- [ ] **Step 4: Run to verify GREEN**

Run: `pnpm test -- src/lib/services/quest-presence-machine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/quest-presence-machine.ts src/lib/services/quest-presence-machine.test.ts
git commit -m "feat(presence): pure state machine — transitions and locked-time accounting"
```

---

## Task 3: Presence machine — deadline-first chronological evaluation

Now prove the deadline rules the spec is most emphatic about: chronological grace-vs-end, "APP_ACTIVE wins on state never on deadlines", late-return-never-rescues, and locked-at-end completion crediting.

**Files:**
- Modify: `src/lib/services/quest-presence-machine.ts` (no code change expected — Task 2 already implemented `evaluateDeadlines`; this task adds the tests that lock the behavior in. If a test fails, fix the machine, not the test.)
- Test: `src/lib/services/quest-presence-machine.test.ts` (extend)

- [ ] **Step 1: Write the failing/locking tests**

Append to `src/lib/services/quest-presence-machine.test.ts`:

```ts
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
```

- [ ] **Step 2: Run**

Run: `pnpm test -- src/lib/services/quest-presence-machine.test.ts`
Expected: PASS (Task 2's `evaluateDeadlines` already satisfies these). If any fail, the machine is wrong — fix `quest-presence-machine.ts`, never the test.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/quest-presence-machine.test.ts src/lib/services/quest-presence-machine.ts
git commit -m "test(presence): lock in chronological deadline evaluation and APP_ACTIVE-wins rule"
```

---

## Task 4: Presence machine — cold-start re-judgment

Force-quit / crash / OS-kill recovery. The spec's rule: **one code path** — cold start feeds the persisted MMKV snapshot into the *same* chronological evaluation as warm returns. Two entry rules (LOCKED snapshot; IN_APP/AWAY snapshot via `max(enteredAt, lastAliveAt) + 30s`).

**Files:**
- Modify: `src/lib/services/quest-presence-machine.ts` (add `rehydratePresence`)
- Test: `src/lib/services/quest-presence-machine.test.ts` (extend)

- [ ] **Step 1: Write the failing tests**

Append:

```ts
import { rehydratePresence, type PresenceSnapshot } from './quest-presence-machine';

describe('rehydratePresence (cold start)', () => {
  const config = { actualStartTime: START, scheduledEndTime: END };
  const snap = (over: Partial<PresenceSnapshot>): PresenceSnapshot => ({
    state: 'IN_APP',
    enteredAt: START,
    lockedMs: 0,
    lastAliveAt: START,
    ...over,
  });

  it('LOCKED snapshot, quest ended inside the locked span → COMPLETED source locked (server auto-completed)', () => {
    // locked from 10 min before END; relaunched 5 min after END
    const lockedFrom = END - 10 * 60_000;
    const { context, effects } = rehydratePresence(snap({ state: 'LOCKED', enteredAt: lockedFrom, lastAliveAt: lockedFrom }), config, END + 5 * 60_000);
    expect(context.state).toBe('COMPLETED');
    expect(context.lockedMs).toBe(10 * 60_000); // clipped to END
    expect(effects).toContainEqual({ type: 'REPORT_COMPLETE', lockedMs: 10 * 60_000, source: 'locked' });
  });

  it('LOCKED snapshot, quest still running → resume IN_APP, credit the locked span, PATCH unlock', () => {
    const lockedFrom = START + 5 * 60_000;
    const now = START + 12 * 60_000; // 7 min locked, quest not over
    const { context, effects } = rehydratePresence(snap({ state: 'LOCKED', enteredAt: lockedFrom, lastAliveAt: lockedFrom }), config, now);
    expect(context.state).toBe('IN_APP');
    expect(context.lockedMs).toBe(7 * 60_000);
    expect(effects).toContainEqual({ type: 'PATCH_LOCK', locked: false }); // relaunch means unlocked/foregrounded
  });

  it('IN_APP snapshot crash just before completion → COMPLETED (end beat the grace deadline)', () => {
    // crashed IN_APP with lastAliveAt 5s before END; effective deadline = lastAliveAt + 30s > END
    const lastAliveAt = END - 5_000;
    const { context } = rehydratePresence(snap({ state: 'IN_APP', enteredAt: START, lastAliveAt }), config, END + 60_000);
    expect(context.state).toBe('COMPLETED');
  });

  it('IN_APP snapshot, abandoned at minute 2 of a 30-min quest → FAILED (grace beat the end)', () => {
    const lastAliveAt = START + 2 * 60_000;
    const { context, effects } = rehydratePresence(snap({ state: 'IN_APP', enteredAt: START, lastAliveAt }), config, END + 60_000);
    expect(context.state).toBe('FAILED');
    expect(effects).toContainEqual({ type: 'REPORT_FAIL', reason: 'left_app' });
  });

  it('IN_APP snapshot relaunched quickly (neither deadline elapsed) → resume IN_APP', () => {
    const lastAliveAt = START + 60_000;
    const { context } = rehydratePresence(snap({ state: 'IN_APP', enteredAt: START, lastAliveAt }), config, lastAliveAt + 10_000);
    expect(context.state).toBe('IN_APP');
  });

  it('AWAY snapshot uses enteredAt for the grace anchor', () => {
    const enteredAt = START + 60_000; // left at 1:00, grace would expire 1:30
    const { context } = rehydratePresence(snap({ state: 'AWAY', enteredAt, lastAliveAt: START }), config, START + 5 * 60_000);
    expect(context.state).toBe('FAILED');
  });
});
```

- [ ] **Step 2: Run to verify RED**

Run: `pnpm test -- src/lib/services/quest-presence-machine.test.ts`
Expected: FAIL — `rehydratePresence` / `PresenceSnapshot` not exported.

- [ ] **Step 3: Implement `rehydratePresence`**

Add to `src/lib/services/quest-presence-machine.ts`:

```ts
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
```

Note: `toInApp` from a restored `LOCKED` context closes the segment (crediting the locked span, clipped to `scheduledEndTime`) and emits `PATCH_LOCK(false)` — exactly the "resume IN_APP, credit locked span, PATCH unlock" behavior the test asserts. This is the deliberate, bounded over-credit the spec accepts on both client and server.

- [ ] **Step 4: Run to verify GREEN**

Run: `pnpm test -- src/lib/services/quest-presence-machine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/quest-presence-machine.ts src/lib/services/quest-presence-machine.test.ts
git commit -m "feat(presence): cold-start re-judgment via shared chronological evaluation"
```

---

## Task 5: Pure XP forecast + live multiplier helper

The client only *forecasts* ("62 XP · up to 93 if locked") and shows a live multiplier ("1.18× XP") — it never computes the awarded value. Pure, native-free, table-tested. Mirrors the server formula.

**Files:**
- Create: `src/lib/services/presence-forecast.ts`
- Test: `src/lib/services/presence-forecast.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/services/presence-forecast.test.ts`:

```ts
import { forecastPresenceXP, liveMultiplier } from './presence-forecast';

describe('forecastPresenceXP', () => {
  it('watching now vs fully-locked ceiling (no perks)', () => {
    // base 62, multiplier 1.0 → current 62, max = ceil(62 * 1.5) = 93
    expect(forecastPresenceXP({ baseXP: 62, multiplier: 1 })).toEqual({ current: 62, maxIfLocked: 93 });
  });

  it('stacks additively with a perk multiplier', () => {
    // base 100, multiplier 1.4 → current ceil(140)=140, max ceil(100*(1.4+0.5))=190
    expect(forecastPresenceXP({ baseXP: 100, multiplier: 1.4 })).toEqual({ current: 140, maxIfLocked: 190 });
  });
});

describe('liveMultiplier', () => {
  it('is the plain multiplier at 0% locked', () => {
    expect(liveMultiplier({ multiplier: 1, lockedMs: 0, totalDurationMs: 30 * 60_000 })).toBeCloseTo(1);
  });
  it('adds 0.5 × lockedFraction, clamped to [0,1]', () => {
    // 12 of 30 min locked → fraction 0.4 → +0.2 → 1.2 (with multiplier 1.0)
    expect(liveMultiplier({ multiplier: 1, lockedMs: 12 * 60_000, totalDurationMs: 30 * 60_000 })).toBeCloseTo(1.2);
  });
  it('caps at multiplier + 0.5 when fully (or over) locked', () => {
    expect(liveMultiplier({ multiplier: 1.4, lockedMs: 60 * 60_000, totalDurationMs: 30 * 60_000 })).toBeCloseTo(1.9);
  });
});
```

- [ ] **Step 2: Run to verify RED**

Run: `pnpm test -- src/lib/services/presence-forecast.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/services/presence-forecast.ts`:

```ts
/**
 * Pure client-side XP forecasting. The server owns the awarded value; this only
 * drives the on-screen "62 XP · up to 93 if locked" hint and the live "1.18× XP"
 * multiplier. Formula mirrors the server:
 *   finalXP = ceil(baseXP × (multiplier + 0.5 × lockedFraction))
 * where multiplier = 1 + perkBonus and lockedFraction is clamped to [0, 1].
 */

export const forecastPresenceXP = ({
  baseXP,
  multiplier,
}: {
  baseXP: number;
  multiplier: number;
}): { current: number; maxIfLocked: number } => ({
  current: Math.ceil(baseXP * multiplier),
  maxIfLocked: Math.ceil(baseXP * (multiplier + 0.5)),
});

export const liveMultiplier = ({
  multiplier,
  lockedMs,
  totalDurationMs,
}: {
  multiplier: number;
  lockedMs: number;
  totalDurationMs: number;
}): number => {
  const safeTotal = totalDurationMs > 0 ? totalDurationMs : 1;
  const lockedFraction = Math.max(0, Math.min(1, lockedMs / safeTotal));
  return multiplier + 0.5 * lockedFraction;
};
```

- [ ] **Step 4: Run to verify GREEN**

Run: `pnpm test -- src/lib/services/presence-forecast.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/presence-forecast.ts src/lib/services/presence-forecast.test.ts
git commit -m "feat(presence): pure XP forecast and live-multiplier helpers"
```

---

## Task 6: Quest-run client calls — `/begin`, `/confirm`, and `left_app` fail

Add the two new client calls against the locked contract, and teach the existing status PATCH to send `failureReason`. Widen the response status union to cover the new server states.

**Files:**
- Modify: `src/lib/services/quest-run-service.ts` (`:8` status types, `:24-26` response type, add `beginQuestRun`/`confirmQuestRun` near `:217`, extend `updateQuestRunStatus` `:155-200`)
- Test: `src/lib/services/quest-run-service.test.ts` (extend if present; else create)

- [ ] **Step 1: Check for an existing service test, then write the failing tests**

Run: `ls src/lib/services/quest-run-service.test.ts 2>/dev/null || echo absent`

Create or extend `src/lib/services/quest-run-service.test.ts` (mock the axios clients — mirror the token-switch: default to the regular client by leaving `provisionalAccessToken` unset):

```ts
import { beginQuestRun, confirmQuestRun, updateQuestRunStatus } from './quest-run-service';
import { apiClient } from '@/api/common/client';

jest.mock('@/api/common/client', () => ({
  apiClient: { post: jest.fn(), patch: jest.fn(), get: jest.fn() },
}));
jest.mock('@/api/common/provisional-client', () => ({
  provisionalApiClient: { post: jest.fn(), patch: jest.fn(), get: jest.fn() },
}));
jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(() => null), // no provisional token → regular client
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedPatch = apiClient.patch as jest.Mock;

describe('beginQuestRun', () => {
  it('PATCHes /begin with an empty body and returns the run', async () => {
    mockedPatch.mockResolvedValueOnce({ data: { id: 'r1', status: 'active', enforcement: 'presence' } });
    const run = await beginQuestRun('r1');
    expect(mockedPatch).toHaveBeenCalledWith('/quest-runs/r1/begin', {});
    expect(run.status).toBe('active');
  });

  it('rejects an invalid run id before hitting the network', async () => {
    await expect(beginQuestRun('null')).rejects.toThrow(/invalid quest run id/i);
    expect(mockedPatch).not.toHaveBeenCalled();
  });
});

describe('confirmQuestRun', () => {
  it('PATCHes /confirm with an empty body', async () => {
    mockedPatch.mockResolvedValueOnce({ data: { id: 'r1', status: 'completed' } });
    const run = await confirmQuestRun('r1');
    expect(mockedPatch).toHaveBeenCalledWith('/quest-runs/r1/confirm', {});
    expect(run.status).toBe('completed');
  });
});

describe('updateQuestRunStatus with failureReason', () => {
  it('sends failureReason for a left_app fail', async () => {
    mockedPatch.mockResolvedValueOnce({ data: { id: 'r1', status: 'failed', failureReason: 'left_app' } });
    await updateQuestRunStatus('r1', 'failed', null, undefined, 'left_app');
    expect(mockedPatch).toHaveBeenCalledWith(
      '/quest-runs/r1/status',
      expect.objectContaining({ status: 'failed', failureReason: 'left_app' })
    );
  });
});
```

- [ ] **Step 2: Run to verify RED**

Run: `pnpm test -- src/lib/services/quest-run-service.test.ts`
Expected: FAIL — `beginQuestRun`/`confirmQuestRun` not exported; `updateQuestRunStatus` ignores a 5th arg.

- [ ] **Step 3: Implement**

In `src/lib/services/quest-run-service.ts`:

(a) Widen the status vocabularies (`:8` and the `QuestRunResponse` interface `:24-26`) so responses can carry the new server states:

```ts
export type QuestRunStatus =
  | 'pending'
  | 'active'
  | 'awaiting_confirmation'
  | 'failed'
  | 'completed'
  | 'success'; // 'success' retained for back-compat with existing callers
```

Add `failureReason?: string` and (if present in the response type) `enforcement?: 'presence' | 'lock'` to `QuestRunResponse`.

(b) Extend `updateQuestRunStatus` to accept and forward `failureReason` (additive 5th param — existing callers pass 4 args and are unaffected):

```ts
export async function updateQuestRunStatus(
  runId: string,
  status: QuestRunStatus,
  liveActivityId?: string | null,
  ready?: boolean,
  failureReason?: string
): Promise<QuestRunResponse> {
  const payload: Record<string, unknown> = { status };
  if (liveActivityId) payload.liveActivityId = liveActivityId;
  if (typeof ready === 'boolean') payload.ready = ready;
  if (failureReason) payload.failureReason = failureReason;

  const hasProvisionalToken = !!getItem('provisionalAccessToken');
  const client = hasProvisionalToken ? provisionalApiClient : apiClient;
  const response = await client.patch<QuestRunResponse>(`/quest-runs/${runId}/status`, payload);
  return response.data;
}
```

(c) Add the two new calls (place them beside `updatePhoneLockStatus`, reusing the same invalid-id guard + token switch):

```ts
/** Activate a solo run in presence mode (server sets status/enforcement/times, schedules completion). */
export async function beginQuestRun(runId: string): Promise<QuestRunResponse> {
  if (!runId || runId === 'null' || runId === 'undefined') {
    throw new Error('Invalid quest run ID for begin');
  }
  const hasProvisionalToken = !!getItem('provisionalAccessToken');
  const client = hasProvisionalToken ? provisionalApiClient : apiClient;
  const response = await client.patch<QuestRunResponse>(`/quest-runs/${runId}/begin`, {});
  return response.data;
}

/** Confirm completion of a presence run (from awaiting_confirmation, or active past scheduledEndTime). */
export async function confirmQuestRun(runId: string): Promise<QuestRunResponse> {
  if (!runId || runId === 'null' || runId === 'undefined') {
    throw new Error('Invalid quest run ID for confirm');
  }
  const hasProvisionalToken = !!getItem('provisionalAccessToken');
  const client = hasProvisionalToken ? provisionalApiClient : apiClient;
  const response = await client.patch<QuestRunResponse>(`/quest-runs/${runId}/confirm`, {});
  return response.data;
}
```

- [ ] **Step 4: Run to verify GREEN**

Run: `pnpm test -- src/lib/services/quest-run-service.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check (the widened union must not break existing callers)**

Run: `pnpm type-check`
Expected: PASS. If a consumer switches on `QuestRunStatus` exhaustively, add the new arms (`awaiting_confirmation`, `completed`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/quest-run-service.ts src/lib/services/quest-run-service.test.ts
git commit -m "feat(quest-run-service): add begin/confirm calls and left_app failureReason"
```

---

## Task 7: Run-level `enforcement` type + rehydrate stale-clear guard

Presence is a run property. Add it to `Quest`, and stop the store from stale-clearing a presence `activeQuest` once its duration elapses (a presence run legitimately outlives its window while `awaiting_confirmation`).

**Files:**
- Modify: `src/store/types.ts:50-58` (`Quest`)
- Modify: `src/store/quest-store.ts:810-833` (rehydrate stale-clear)
- Test: `src/store/quest-store.test.ts` (extend if present; else add a focused test)

- [ ] **Step 1: Write the failing test**

Add to (or create) `src/store/quest-store.test.ts` a test that rehydrating a presence quest whose duration has elapsed does NOT clear `activeQuest`:

```ts
// Pseudocode shape — adapt to the store's existing test harness/rehydrate helper.
it('does not stale-clear a presence activeQuest after its duration elapses', () => {
  const longAgoStart = Date.now() - 60 * 60 * 1000; // 60 min ago
  const state = {
    activeQuest: {
      id: 'q1', mode: 'custom', durationMinutes: 30, startTime: longAgoStart,
      status: 'active', enforcement: 'presence',
    },
  } as any;
  const cleaned = runRehydrateCleanup(state); // the onRehydrateStorage logic under test
  expect(cleaned.activeQuest).not.toBeNull(); // presence runs survive; the runtime re-judges them
});

it('still stale-clears a lock-mode activeQuest after its duration elapses', () => {
  const longAgoStart = Date.now() - 60 * 60 * 1000;
  const state = {
    activeQuest: { id: 'q2', mode: 'custom', durationMinutes: 30, startTime: longAgoStart, status: 'active' },
  } as any;
  const cleaned = runRehydrateCleanup(state);
  expect(cleaned.activeQuest).toBeNull();
});
```

If the store's stale-clear is inline in `onRehydrateStorage` and not independently callable, extract it into an exported pure helper (e.g. `cleanupRehydratedState(state)`) as part of this task and test that — a small, behavior-preserving refactor that also makes the guard testable.

- [ ] **Step 2: Run to verify RED**

Run: `pnpm test -- src/store/quest-store.test.ts`
Expected: FAIL — presence run is currently cleared by the `now > startTime + durationMinutes*60*1000` guard.

- [ ] **Step 3: Implement**

(a) `src/store/types.ts` — add to the run-level `Quest` type (NOT the template interfaces):

```ts
export type Quest = (StoryQuestTemplate | CustomQuestTemplate) & {
  startTime: number;
  stopTime?: number;
  status: QuestStatus;
  customId?: string;
  questRunId?: string;
  reflection?: QuestReflection;
  participants?: QuestParticipant[];
  enforcement?: 'presence' | 'lock'; // presence is a RUN property; templates keep mode story|custom
};
```

(b) `src/store/quest-store.ts` — guard the stale-clear (`:810-833`): skip presence runs, whose completion is decided by the runtime's cold-start re-judgment, not by wall-clock elapse:

```ts
const durationMs = activeQuest.durationMinutes * 60 * 1000;
const elapsed = now > activeQuest.startTime + durationMs;
// Presence runs legitimately outlive their window while awaiting confirmation —
// the presence runtime re-judges them on cold start. Only stale-clear lock-mode runs.
if (elapsed && (activeQuest.enforcement ?? 'lock') !== 'presence') {
  // ...existing clear logic unchanged...
}
```

- [ ] **Step 4: Run to verify GREEN + type-check**

Run: `pnpm test -- src/store/quest-store.test.ts && pnpm type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/types.ts src/store/quest-store.ts src/store/quest-store.test.ts
git commit -m "feat(quest-store): run-level enforcement field; exempt presence runs from stale-clear"
```

---

## Task 8: `QuestTimer` slims to orchestration (solo presence start)

Merge `prepareQuest` + the lock-gated start into one immediate presence start (`createQuestRun` → `beginQuestRun` → local `startQuest`), and strip the solo pass/fail decision out of `onPhoneUnlocked`/`backgroundTask` — those decisions now live in the machine/runtime. **Cooperative paths are unchanged.**

**Files:**
- Modify: `src/lib/services/quest-timer.ts` (add `startPresenceQuest`; gut solo decisions from `onPhoneUnlocked:579`, `backgroundTask:897`; keep coop branches)
- Modify the 5 solo call sites to call the merged start (`use-quest-selection.ts:73/94`, `onboarding/first-quest.tsx:172`, `use-quest-creation.ts:62`; leave the coop caller `cooperative-quest-ready.tsx:293` on the legacy `prepareQuest`)
- Test: `src/lib/services/quest-timer.test.ts` (rewrite solo expectations; keep coop assertions)

- [ ] **Step 1: Write the failing tests (new solo start; coop unchanged)**

Rewrite the solo portion of `src/lib/services/quest-timer.test.ts`:

```ts
it('startPresenceQuest creates the run, begins it, and starts the local active quest', async () => {
  (createQuestRun as jest.Mock).mockResolvedValue({ id: 'run1', status: 'pending', quest: { durationMinutes: 30, reward: { xp: 50 } } });
  (beginQuestRun as jest.Mock).mockResolvedValue({
    id: 'run1', status: 'active', enforcement: 'presence',
    actualStartTime: START_MS, scheduledEndTime: START_MS + 30 * 60_000,
  });

  await QuestTimer.startPresenceQuest(customTemplate);

  expect(createQuestRun).toHaveBeenCalledWith(customTemplate);
  expect(beginQuestRun).toHaveBeenCalledWith('run1');
  const started = useQuestStore.getState().startQuest as jest.Mock;
  expect(started).toHaveBeenCalledWith(expect.objectContaining({ questRunId: 'run1', enforcement: 'presence' }));
});

it('onPhoneUnlocked no longer fails a SOLO presence quest (the machine owns that)', async () => {
  // set up an in-flight solo presence run, then unlock early
  await QuestTimer.startPresenceQuest(customTemplate);
  (updatePhoneLockStatus as jest.Mock).mockClear();
  await QuestTimer.onPhoneUnlocked();
  // no failQuest / no status→failed side effect from the timer for solo presence
  expect(useQuestStore.getState().failQuest).not.toHaveBeenCalled();
});

// COOP compat — keep the existing assertion verbatim:
it('throws when a cooperative quest is prepared without a server run id', async () => {
  await expect(QuestTimer.prepareQuest(coopTemplate)).rejects.toThrow(
    'Cooperative quest must have an existing quest run ID from server'
  );
});
```

- [ ] **Step 2: Run to verify RED**

Run: `pnpm test -- src/lib/services/quest-timer.test.ts`
Expected: FAIL — `startPresenceQuest` does not exist; `onPhoneUnlocked` still fails solo quests.

- [ ] **Step 3: Implement the merged solo start + strip solo decisions**

In `src/lib/services/quest-timer.ts`:

- Add `import { beginQuestRun } from './quest-run-service';` alongside the existing imports (`:13-17`).
- Add a static `startPresenceQuest(questTemplate)` that: creates the run (`createQuestRun`), calls `beginQuestRun(run.id)`, persists `questRunId`, mints/starts the iOS Live Activity with `status:'active'` and the Android foreground service (reusing the existing Live-Activity/`BackgroundService.start` code, but with active copy), and calls `useQuestStore.getState().startQuest({ ...questFromTemplate, questRunId, enforcement: 'presence', startTime: Date.now() })`. This collapses the old `prepareQuest` + `onPhoneLocked` solo start into one immediate call — there is no pending/lock-gated intermediate for solo.
- In `onPhoneLocked` (`:325`) and `onPhoneUnlocked` (`:579`): keep the **cooperative** branches exactly as-is. For a **solo presence** run, these native-driven timer hooks are superseded by the runtime (Task 9) — guard the solo branches so the timer takes no pass/fail action for presence runs (the machine/runtime does). The simplest, lowest-risk gate: at the top of the solo branch, `if ((activeQuest?.enforcement ?? 'lock') === 'presence') return;`.
- In `backgroundTask` (`:897`, the Android foreground loop): keep updating the notification countdown, but guard the solo completion decision for presence runs — the gate is `if (elapsedTime >= questDuration)` at `:1048` and the `completeQuest(true)` call it wraps is at `:1085` (block spans ~`:1048-1090`). For a presence run the runtime reports completion, so this block must not fire. (Coop and any residual lock-mode remain.)

Keep every cooperative code path, Live Activity call, and `BackgroundService` call otherwise unchanged.

- [ ] **Step 4: Update the 5 solo call sites**

Replace the two-call `useQuestStore.prepareQuest(...)` + `QuestTimer.prepareQuest(...)` + `router.push('/pending-quest')` sequence, for SOLO quests only, with `QuestTimer.startPresenceQuest(...)` (navigation then resolves to `/active-quest` via Task 12). Sites: `src/features/home/hooks/use-quest-selection.ts:70-73` & `:93-94`, `src/app/onboarding/first-quest.tsx:168-172`, `src/components/custom-quest/hooks/use-quest-creation.ts:59-62`. **Do not touch** `src/app/cooperative-quest-ready.tsx:293` (coop).

- [ ] **Step 5: Run to verify GREEN + coop compat**

Run: `pnpm test -- src/lib/services/quest-timer.test.ts`
Expected: PASS — solo start reshaped, coop assertions unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/quest-timer.ts src/features/home/hooks/use-quest-selection.ts src/app/onboarding/first-quest.tsx src/components/custom-quest/hooks/use-quest-creation.ts src/lib/services/quest-timer.test.ts
git commit -m "feat(quest-timer): immediate solo presence start; delegate solo pass/fail to the machine"
```

---

## Task 9: The presence runtime (single mount; execute effects; persist snapshot)

The one place that turns platform signals into machine events, runs the machine, executes its effects, and persists the snapshot. Consolidates the double-mounted `useLockStateDetection`. Routes coop → legacy timer handlers.

**Files:**
- Create: `src/lib/services/quest-presence-runtime.ts`
- Test: `src/lib/services/quest-presence-runtime.test.ts`
- Modify: `src/lib/hooks/useLockStateDetection.ts` (becomes the single runtime mount, or is replaced by a `usePresenceRuntime()` mounted once)
- Modify: `src/app/(app)/_layout.tsx:61-62` (remove the second mount)

- [ ] **Step 1: Write the failing tests**

Create `src/lib/services/quest-presence-runtime.test.ts`. Use the repo's proven AppState mock idiom (capture listeners, fire them — see `src/components/providers/websocket-provider.test.tsx:45-98`) and a `modules/lock-state` mock (`jest.mock('@/../modules/lock-state', () => ({ __esModule: true, default: jest.fn(() => ({ remove: jest.fn() })) }))`). Mock `quest-run-service`, `notifications`, `@/lib/storage`, and use `jest.useFakeTimers()` for the grace/complete deadlines.

```ts
it('SCREEN_LOCKED event PATCHes lock:true and persists the snapshot', async () => {
  const rt = startRuntimeForActivePresenceRun(config);
  fireLockEvent('LOCKED');
  await flush();
  expect(updatePhoneLockStatus).toHaveBeenCalledWith(runId, true);
  expect(setItem).toHaveBeenCalledWith(SNAPSHOT_KEY, expect.objectContaining({ state: 'LOCKED' }));
});

it('APP_BACKGROUND arms a 30s grace timer and, on expiry, reports left_app', async () => {
  const rt = startRuntimeForActivePresenceRun(config);
  fireAppState('background');
  jest.advanceTimersByTime(30_000);
  await flush();
  expect(updateQuestRunStatus).toHaveBeenCalledWith(runId, 'failed', null, undefined, 'left_app');
});

it('returning within grace cancels the timer and warning, no fail', async () => {
  startRuntimeForActivePresenceRun(config);
  fireAppState('background');
  jest.advanceTimersByTime(10_000);
  fireAppState('active');
  jest.advanceTimersByTime(30_000);
  await flush();
  expect(updateQuestRunStatus).not.toHaveBeenCalled();
});

it('TIMER_COMPLETE while foregrounded confirms via /confirm (watched)', async () => {
  startRuntimeForActivePresenceRun(config);
  jest.setSystemTime(config.scheduledEndTime);
  jest.advanceTimersByTime(config.scheduledEndTime - config.actualStartTime);
  await flush();
  expect(confirmQuestRun).toHaveBeenCalledWith(runId);
});

it('cold start rehydrates from the MMKV snapshot and re-judges (abandoned → left_app)', async () => {
  (getItem as jest.Mock).mockReturnValue({ state: 'IN_APP', enteredAt: config.actualStartTime, lockedMs: 0, lastAliveAt: config.actualStartTime + 2 * 60_000 });
  jest.setSystemTime(config.scheduledEndTime + 60_000);
  startRuntimeForActivePresenceRun(config); // no live start; picks up the snapshot
  await flush();
  expect(updateQuestRunStatus).toHaveBeenCalledWith(runId, 'failed', null, undefined, 'left_app');
});

it('an active COOPERATIVE run routes lock/unlock to the legacy QuestTimer handlers, not the machine', async () => {
  startRuntimeForActiveCoopRun();
  fireLockEvent('LOCKED');
  await flush();
  expect(QuestTimer.onPhoneLocked).toHaveBeenCalled();
  expect(updatePhoneLockStatus).not.toHaveBeenCalledWith(expect.anything(), true); // machine did not drive it
});
```

- [ ] **Step 2: Run to verify RED**

Run: `pnpm test -- src/lib/services/quest-presence-runtime.test.ts`
Expected: FAIL — runtime not implemented.

- [ ] **Step 3: Implement the runtime**

Create `src/lib/services/quest-presence-runtime.ts`. Responsibilities:

1. **Subscribe once** to `AppState` (`change` → `APP_ACTIVE`/`APP_BACKGROUND`) and to `addLockListener('LOCKED'|'UNLOCKED')` (→ `SCREEN_LOCKED`/`SCREEN_UNLOCKED`).
2. **Dispatch by run kind — spell out the discriminator.** Read the active run from the store. Cooperative runs populate **both** `activeQuest` and `cooperativeQuestRun` (the store keys coop off `cooperativeQuestRun.id === questRunId`), and they never carry `enforcement`. So: if there is an `activeQuest` with `(activeQuest.enforcement ?? 'lock') === 'presence'` → feed the machine. Else if there is an active run that is cooperative (`cooperativeQuestRun` matches, equivalently `enforcement !== 'presence'`) → forward the raw lock/AppState signal to `QuestTimer.onPhoneLocked()`/`onPhoneUnlocked()` (legacy) and do nothing else — never feed a coop event to the machine (that would double-drive the lock PATCH). If there is no active run → ignore. Do **not** key the dispatch off `activeQuest` alone.
3. **On (re)start**, hydrate: if a valid MMKV snapshot exists for the active run, `rehydratePresence(snapshot, config, Date.now())`; else `initPresenceContext(config, Date.now())`. Execute the returned effects.
4. **Reduce + execute** on each event: `const { context, effects } = presenceReducer(ctx, event, Date.now()); ctx = context; runEffects(effects);`
5. **Effect executor** (`runEffects`):
   - `ARM_GRACE_DEADLINE` → `setTimeout` at `at - now` dispatching `{type:'GRACE_DEADLINE'}` (store the handle to cancel).
   - `CANCEL_GRACE_DEADLINE` → clear it.
   - `SCHEDULE_WARNING_NOTIFICATION` → schedule the local warning notification ("⚠️ Your hero is in danger! Return to Emberglow or lock your phone.") ~`delayMs` out via the existing notifications service.
   - `CANCEL_WARNING_NOTIFICATION` → cancel it.
   - `PATCH_LOCK` → `updatePhoneLockStatus(runId, locked, useQuestStore.getState().currentLiveActivityId)`. Pass the Live Activity ID (the legacy lock path did) so the server refreshes the iOS Live Activity / countdown on lock, per the spec's "lock-mode surfaces keep showing the countdown."
   - `REPORT_FAIL` → `updateQuestRunStatus(runId, 'failed', null, undefined, 'left_app')` then `useQuestStore.getState().failQuest()`.
   - `REPORT_COMPLETE` → `source==='watched'` → `confirmQuestRun(runId)` then `useQuestStore.getState().completeQuest(true)`; `source==='locked'` → `getQuestRunStatus(runId)` (server auto-completed; pull rewards) then `completeQuest(true)`.
   - `PERSIST_SNAPSHOT` → `setItem(snapshotKey(runId), { state, enteredAt, lockedMs, lastAliveAt })`.
6. **Arm the completion timer** once on start: `setTimeout` at `scheduledEndTime - now` dispatching `{type:'TIMER_COMPLETE'}` (only fires if still foregrounded; JS timers are suspended while backgrounded — the deadline-first eval catches the rest).
7. **`lastAliveAt` tick:** while `IN_APP`, a 1s interval writes `lastAliveAt = Date.now()` into the snapshot (cheap MMKV write) so cold-start judgment anchors at the moment the app died. Stop the tick when not IN_APP.
8. **Teardown** removes AppState + lock subscriptions, clears all timers/intervals.

Expose a small imperative surface plus a `usePresenceRuntime()` React hook wrapper (a `useEffect` that mounts/unmounts the runtime) and a subscribable snapshot of the current view state for `useQuestPresence()` (Task 10). Keep the machine import pure — the runtime is the only file that touches AppState/native/timers/MMKV/network.

- [ ] **Step 4: Consolidate the mount (fix the double-mount)**

- In `src/app/(app)/_layout.tsx`, **remove** the `useLockStateDetection()` call at `:61-62` and its import at `:8`.
- In `src/app/_layout.tsx`, replace the single remaining `useLockStateDetection()` at `:388-389` with `usePresenceRuntime()` (the runtime supersedes the old hook and covers both solo-presence and coop dispatch). Update the `_layout.test.tsx` mock (`:132`) to mock the new hook.

- [ ] **Step 5: Run to verify GREEN**

Run: `pnpm test -- src/lib/services/quest-presence-runtime.test.ts src/app/_layout.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/quest-presence-runtime.ts src/lib/services/quest-presence-runtime.test.ts src/lib/hooks/useLockStateDetection.ts src/app/_layout.tsx 'src/app/(app)/_layout.tsx' src/app/_layout.test.tsx
git commit -m "feat(presence): single runtime executes machine effects; consolidate lock-detection mount"
```

---

## Task 10: `useQuestPresence()` hook

A read-only view into the runtime for the screen. It exposes derived display state; it **never** computes a pass/fail decision.

**Files:**
- Create: `src/lib/hooks/useQuestPresence.ts`
- Test: `src/lib/hooks/useQuestPresence.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/lib/hooks/useQuestPresence.test.tsx` — mock the runtime's subscribable state and assert the hook maps it to `{ state, remainingMs, lockedMs, liveMultiplier, forecast, isMuted }`:

```ts
it('maps runtime state + config to display values', () => {
  mockRuntimeState({ state: 'LOCKED', lockedMs: 12 * 60_000, ctx: { actualStartTime: START, scheduledEndTime: START + 30 * 60_000, multiplier: 1, baseXP: 62 } });
  jest.setSystemTime(START + 18 * 60_000);
  const { result } = renderHook(() => useQuestPresence());
  expect(result.current.state).toBe('LOCKED');
  expect(result.current.remainingMs).toBe(12 * 60_000);
  expect(result.current.liveMultiplier).toBeCloseTo(1.2);
  expect(result.current.forecast).toEqual({ current: 62, maxIfLocked: 93 });
});
```

- [ ] **Step 2: RED → implement → GREEN**

Implement `useQuestPresence()` to subscribe to the runtime's view state and compute `remainingMs = max(0, scheduledEndTime - now)`, `liveMultiplier(...)` and `forecastPresenceXP(...)` from Task 5, plus the persisted mute flag. Re-render on a 1s tick while active so the countdown/multiplier animate. No decision logic.

Run: `pnpm test -- src/lib/hooks/useQuestPresence.test.tsx`
Expected: RED then PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/useQuestPresence.ts src/lib/hooks/useQuestPresence.test.tsx
git commit -m "feat(presence): useQuestPresence read-only view hook"
```

---

## Task 11: iOS native lock-state — protected-data observers

Replace the background/foreground-as-lock proxy with true lock detection. Android is already correct and stays untouched. Native Swift cannot be unit-tested in Jest — verification is a compile/prebuild + the device-QA matrix (Task 17); the JS event contract (`LOCKED`/`UNLOCKED`) is unchanged, so all JS tests still hold.

**Files:**
- Modify: `modules/lock-state/ios/LockStateModule.swift:13-29`

- [ ] **Step 1: Confirm the JS contract is untouched (regression guard)**

Run: `pnpm test -- src/lib/services/quest-presence-runtime.test.ts`
Expected: PASS (the runtime consumes `LOCKED`/`UNLOCKED`; the native source of those events is irrelevant to JS tests). This is the guard that the Swift change below can't break the JS layer.

- [ ] **Step 2: Replace the observers**

In `modules/lock-state/ios/LockStateModule.swift`, swap the two `UIApplication` lifecycle observers for protected-data observers:

```swift
self.backgroundObserver = NotificationCenter.default.addObserver(
  forName: UIApplication.protectedDataWillBecomeUnavailableNotification,
  object: nil, queue: .main) { [weak self] _ in
    self?.sendEvent("LOCKED", ["reason": "Protected data unavailable (device locked)"])
}
self.foregroundObserver = NotificationCenter.default.addObserver(
  forName: UIApplication.protectedDataDidBecomeAvailableNotification,
  object: nil, queue: .main) { [weak self] _ in
    self?.sendEvent("UNLOCKED", ["reason": "Protected data available (device unlocked)"])
}
```

Keep the observer field names, `Events("LOCKED", "UNLOCKED")`, and the `OnDestroy` teardown as-is. **Known, accepted limitation (spec):** devices with no passcode never emit protected-data signals, so a passcode-less user's lock reads as AWAY and fails after grace — they can't earn the lock bonus. Tiny population (all Face ID devices have passcodes); do not add a workaround.

- [ ] **Step 3: Prebuild / compile check**

Run: `pnpm prebuild` (or open `ios/` and build) to confirm the Swift compiles against the module. If prebuild is not run in this environment, note that the compile is verified during the device-QA pass (Task 17) and record it as a blocker for that task.
Expected: iOS build succeeds.

- [ ] **Step 4: Commit**

```bash
git add modules/lock-state/ios/LockStateModule.swift
git commit -m "feat(lock-state): iOS true lock via protected-data observers (replaces bg/fg proxy)"
```

---

## Task 12: Navigation — `activeQuest → /active-quest`

Wire the resolver, the route dispatcher, and the screen registration so an active presence run lands on the new screen.

**Files:**
- Modify: `src/lib/navigation/navigation-state-resolver.ts` (`:9-19`, `:32-41`, `:50-65`, `~:153`)
- Modify: `src/app/navigation-gate.tsx` (`~:85`)
- Modify: `src/app/_layout.tsx` (~`:413` Stack.Screen registration)
- Test: `src/lib/navigation/navigation-state-resolver.test.ts` (extend)

- [ ] **Step 1: Write the failing test**

Add two resolver tests: (a) an active **solo presence** run (`activeQuest.enforcement === 'presence'`) resolves to `{ type: 'active-quest', questId: activeQuest.id }` at Priority 2; (b) an active **cooperative** run (`activeQuest` set, `enforcement` absent) does **NOT** resolve to `active-quest` — it must fall through to the existing coop routing. Test (b) is the compat guard for the blocker below.

- [ ] **Step 2: RED → implement → GREEN**

- `NavigationTarget` (`:9-19`): add `| { type: 'active-quest'; questId: string }`.
- Snapshot (`:32-41`) + subscription (`:50-65`): add `activeQuest: state.activeQuest`.
- Priority 2 (`~:153`): add, before the `pendingQuest` block, a **presence-gated** case — cooperative runs also set `activeQuest` (`quest-timer.ts:470`/`:979`) but never carry `enforcement`, so gating on presence cleanly excludes them and keeps the coop flow byte-identical:

```ts
if (activeQuest && (activeQuest.enforcement ?? 'lock') === 'presence') {
  return { type: 'active-quest', questId: activeQuest.id };
}
```

**Do not** use a bare `if (activeQuest)` — that would route active coop runs onto the solo presence screen, and Task 16's coop diff-proof would not catch it (the regression would live in this shared resolver, not a coop-named file).
- `src/app/navigation-gate.tsx`: add `case 'active-quest': router.replace('/active-quest'); break;` before the `never` exhaustiveness check (`:85`).
- `src/app/_layout.tsx`: register `<Stack.Screen name="active-quest" options={{ gestureEnabled: false }} />` near the `pending-quest` registration (~`:413`).

Run: `pnpm test -- src/lib/navigation/navigation-state-resolver.test.ts && pnpm type-check`
Expected: RED then PASS (the `never` check forces the `navigation-gate` case to exist).

- [ ] **Step 3: Commit**

```bash
git add src/lib/navigation/navigation-state-resolver.ts src/app/navigation-gate.tsx src/app/_layout.tsx src/lib/navigation/navigation-state-resolver.test.ts
git commit -m "feat(navigation): route active presence quests to /active-quest"
```

---

## Task 13: Active-quest screen + components

Build the screen from the v3 mockup (`.superpowers/brainstorm/8024-1783061626/quest-screen-v3.html`). It renders `useQuestPresence()` and holds the screen awake with `expo-keep-awake`. It computes no decisions.

**Files:**
- Create: `src/app/active-quest.tsx` + `src/app/active-quest/components/{campfire-ambience,journey-progress-bar,countdown-display,presence-info-strip,presence-footer,ambient-music-pill}.tsx`
- Test: `src/app/active-quest.test.tsx` + co-located component tests

- [ ] **Step 1: Write the failing screen test**

Create `src/app/active-quest.test.tsx` (mock `useQuestPresence`, `expo-keep-awake`, `expo-audio`, reanimated per the repo idiom; borrow the perk-chip pattern from `src/components/quest-preview/`):

```ts
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

it('renders countdown, forecast, live multiplier, and both footer lines from presence state', () => {
  mockUseQuestPresence({ state: 'IN_APP', remainingMs: 23 * 60_000 + 41_000, liveMultiplier: 1.18, forecast: { current: 62, maxIfLocked: 93 }, questTitle: 'The Whispering Glade', mode: 'story' });
  render(<ActiveQuestScreen />);
  expect(screen.getByText('23:41')).toBeTruthy();
  expect(screen.getByText(/62 XP/)).toBeTruthy();
  expect(screen.getByText(/up to 93 if locked/)).toBeTruthy();
  expect(screen.getByText(/1\.18× XP/)).toBeTruthy();
  expect(screen.getByText(/Lock your phone anytime/)).toBeTruthy();
  expect(screen.getByText(/Leaving the app will end the quest early/)).toBeTruthy();
});

it('calls useKeepAwake so the screen never idle-dims', () => {
  mockUseQuestPresence({ state: 'IN_APP', remainingMs: 60_000 });
  render(<ActiveQuestScreen />);
  expect(useKeepAwake).toHaveBeenCalled();
});
```

- [ ] **Step 2: RED → implement → GREEN**

Build the components to the mockup's structure and data hierarchy:
- `campfire-ambience.tsx` — full-bleed glow + blurred flame core + drifting embers (RN equivalents via reanimated / `expo-linear-gradient` / `expo-blur`; no emoji).
- `presence-info-strip.tsx` — quest chip (`getQuestModeLabel(mode)` + title) and the borrowed active-perk chips + live XP forecast ("62 XP · up to 93 if locked"), reusing the `perk-badge` pattern from `src/components/quest-preview/perk-badge.tsx`.
- `countdown-display.tsx` — large tabular-nums countdown (`fontVariant: ['tabular-nums']`) from `remainingMs`.
- `journey-progress-bar.tsx` — a track with a circular player token (player portrait; lucide `user` fallback) traveling toward a lucide `flag`; "21:19 travelled" left, live "1.18× XP" right.
- `ambient-music-pill.tsx` — mute toggle bound to the persisted mute flag (Task 14 wires audio).
- `presence-footer.tsx` — two differentiated lines: bright/semibold with lock icon "Lock your phone anytime — the quest continues"; dimmer/smaller "Leaving the app will end the quest early".
- `active-quest.tsx` — `useKeepAwake()`; read `useQuestPresence()`; compose the components. Never branch on a decision the machine owns.

Run: `pnpm test -- src/app/active-quest.test.tsx`
Expected: RED then PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/active-quest.tsx src/app/active-quest/ src/app/active-quest.test.tsx
git commit -m "feat(active-quest): presence screen with campfire ambience, journey bar, forecast, footer"
```

---

## Task 14: `quest-audio.service.ts` — ambient music (expo-audio)

One looped ambient track, delivered via S3 + the existing `audio-cache.service`. Plays during IN_APP; fades on leaving IN_APP; resumes on return; mute persists. No iOS background-audio entitlement — music stops when the phone locks (v1).

> **expo-audio 0.3.5 API (confirmed at the Task 1 gate, SDK 52):** `createAudioPlayer(source, updateInterval?)` → an `AudioPlayer` instance (imperative, for a service singleton); or the `useAudioPlayer(source)` hook. `AudioPlayer` has `.play()`, `.pause()`, `.volume` (settable 0–1), `.loop` (settable boolean), `.replace(source)`, `.seekTo(sec)`, `.remove()` (teardown), and `useAudioPlayerStatus(player)` for state. Global `setAudioModeAsync({ playsInSilentMode, shouldPlayInBackground, ... })` sets the audio session (v1: `shouldPlayInBackground: false` so music stops on lock). Feed it `audioCacheService.getAudioSource(path)`'s `{ uri }`.

**Files:**
- Create: `src/lib/services/quest-audio.service.ts`
- Test: `src/lib/services/quest-audio.service.test.ts`

- [ ] **Step 1: Write the failing tests** (mock `expo-audio` and `audio-cache.service`):

```ts
it('resolves the ambient track through the audio cache and plays looped', async () => {
  (audioCacheService.getAudioSource as jest.Mock).mockResolvedValue({ uri: 'file://ambient.mp3' });
  await questAudio.playAmbient();
  expect(audioCacheService.getAudioSource).toHaveBeenCalled();
  expect(mockPlayer.play).toHaveBeenCalled();
});

it('does not play when muted', async () => {
  (getItem as jest.Mock).mockReturnValue(true); // persisted mute
  await questAudio.playAmbient();
  expect(mockPlayer.play).not.toHaveBeenCalled();
});

it('fadeOut pauses the player', async () => {
  await questAudio.playAmbient();
  await questAudio.fadeOut();
  expect(mockPlayer.pause).toHaveBeenCalled();
});

it('setMuted persists and stops playback when muting', async () => {
  await questAudio.playAmbient();
  await questAudio.setMuted(true);
  expect(setItem).toHaveBeenCalledWith('quest-audio-muted', true);
  expect(mockPlayer.pause).toHaveBeenCalled();
});
```

- [ ] **Step 2: RED → implement → GREEN**

Implement a small singleton: `playAmbient()` (resolve via `audioCacheService.getAudioSource(ambientPath)`, create the looped player, respect persisted mute), `fadeOut()` (ramp `volume` down then `pause`, or `pause` if the API lacks volume ramping), `resume()`, `setMuted(bool)` (persist under `quest-audio-muted`, pause/resume accordingly), `teardown()`. The runtime/screen calls `playAmbient` on entering IN_APP and `fadeOut` on leaving IN_APP; `setMuted` is bound to the music pill.

Run: `pnpm test -- src/lib/services/quest-audio.service.test.ts`
Expected: RED then PASS.

- [ ] **Step 3: Wire play/fade to IN_APP transitions**

In the runtime (or the screen effect), call `questAudio.playAmbient()` on entering IN_APP and `questAudio.fadeOut()` on leaving it. Bind `ambient-music-pill`'s toggle to `questAudio.setMuted`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/quest-audio.service.ts src/lib/services/quest-audio.service.test.ts src/app/active-quest/
git commit -m "feat(active-quest): expo-audio ambient loop with persisted mute and IN_APP fade"
```

---

## Task 15: Results screen — surface the lock bonus

The presence run's `rewards.lockBonus` already reaches the client automatically: `quest-store.completeQuest` fetches the run via `getQuestRunStatus` and maps `participants[].rewards`, which now carries `lockBonus`. This task makes it *visible*, per the spec's client→endpoint mapping ("results screen reads `rewards.lockBonus`"). Data already flows, so nothing breaks if skipped — but the earned bonus would be invisible.

**Files:**
- Modify: `src/store/types.ts:108-113` and `src/api/quest/types.ts:44-49` (add `lockBonus?: number` to `QuestParticipantRewards`)
- Modify: the completed-run reward breakdown — `src/components/quest-complete/*` (and/or `src/components/quest-preview/reward-preview-card.tsx` / `xp-breakdown-row.tsx`)
- Test: the corresponding component test

- [ ] **Step 1: Write the failing test** — a completed presence run whose `rewards.lockBonus > 0` renders a distinct "+N lock bonus" line; a watched (unlocked) completion with `lockBonus: 0` renders no extra line.
- [ ] **Step 2: RED → implement → GREEN** — add `lockBonus?: number` to both `QuestParticipantRewards` types; render the bonus line reusing the existing `xp-breakdown-row` `isBonus` pattern (tinted `+`). Do not compute XP client-side — display the server value.
- [ ] **Step 3: Commit**

```bash
git add src/store/types.ts src/api/quest/types.ts src/components/quest-complete src/components/quest-preview
git commit -m "feat(quest-complete): surface presence lock bonus on the results screen"
```

---

## Task 16: Full-suite compat sweep

**Files:** none — verification only.

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: PASS — including every cooperative-quest test unmodified.

- [ ] **Step 2: Type-check, lint, translations**

Run: `pnpm check-all`
Expected: PASS. Fix any lint/format issues in new code (no `console.log` in production paths — use the repo logger; follow existing patterns).

- [ ] **Step 3: Cooperative compat proof (by diff)**

Run: `git diff main -- 'src/app/cooperative-*' 'src/app/cooperative-quest-lobby' 'src/lib/hooks/use-cooperative-quest.ts'`
Expected: **empty**. The cooperative flow must have zero changes. The only coop-adjacent edits allowed are the guarded solo branches inside `quest-timer.ts` (verify by inspection that every coop branch there is byte-identical to `main`).

- [ ] **Step 4: Machine purity proof (by inspection)**

Confirm `src/lib/services/quest-presence-machine.ts` imports nothing from `react-native`, native modules, timers, MMKV, or the network:
Run: `grep -nE "react-native|modules/lock-state|expo-|setTimeout|setInterval|@/lib/storage|axios|apiClient" src/lib/services/quest-presence-machine.ts`
Expected: **no matches**.

- [ ] **Step 5: Commit any cleanup**

```bash
git add -A
git commit -m "chore(presence): lint/format sweep for unified quest presence"
```

---

## Task 17: Manual device-QA matrix (final checklist)

Native lock behavior, cold-start re-judgment, and audio can only be fully verified on-device. Requires PR #35 merged or running locally (see Pre-flight). Run the app against the presence server and walk the matrix; file bugs, do not check off a row until it passes.

- [ ] **iOS with passcode** — start solo quest → lock → bonus accrues (Live Activity shows countdown) → unlock back into app → resumes IN_APP; complete while locked → COMPLETED with lock bonus on results.
- [ ] **iOS without passcode** — locking reads as AWAY and fails after grace (accepted limitation; confirm it degrades gracefully, no crash).
- [ ] **Android keyguard ON** — `ACTION_SCREEN_OFF`/`ACTION_USER_PRESENT` drive LOCKED/IN_APP correctly.
- [ ] **Android keyguard OFF** — no `ACTION_USER_PRESENT`; confirm "APP_ACTIVE wins on state" rescues on return (no false fail).
- [ ] **Answered call mid-quest** — app backgrounds without lock → AWAY → 30s grace + warning notification ~3s in; returning rescues.
- [ ] **Notification-tap return** — tapping the warning notification returns and rescues.
- [ ] **Force-quit in IN_APP** just before completion → cold start → COMPLETED (end beat grace), confirms to server.
- [ ] **Force-quit in IN_APP** at minute 2 of 30 → cold start → FAILED `left_app`, no XP.
- [ ] **Force-quit while LOCKED** past duration → cold start → COMPLETED (server auto-completed; results show lock bonus).
- [ ] **OS kill during a long lock** → relaunch → locked span credited (clipped to end), resumes or completes correctly.
- [ ] **Ambient music** — plays IN_APP, fades on leave, resumes on return, stops on lock; mute persists across app restarts.
- [ ] **No double-fire** — confirm `updatePhoneLockStatus`/fail/complete each fire once per event (regression check for the old double-mount).

---

## Out of scope (do not implement in this plan)

- **Cooperative quests** (phase B, post `fix/issue-25-websocket-robustness` merge — the lobby/lock-gate code is what phase B reworks).
- **Migrating `StoryNarration.tsx` off `expo-av`** — it keeps `expo-av@~15.0.2`.
- **Per-storyline music tracks; iOS background-audio entitlement** (music under lock) — v1 has one looped track that stops on lock.
- **Offline lock-segment reconciliation** — v1 accepts lost-PATCH under/over-count as benign (never wrongly fails).
- **Heartbeat pings** — rejected in the spec in favor of claim-based completion.
- **A/B experiment flag** — deliberately a full replacement with phased store rollout.
- **Analytics instrumentation** — the metrics pipeline is a Pre-flight question; new PostHog events (if needed) are a follow-up, not this plan.

## Open items to resolve during pre-flight

- **Analytics pipeline** (spec open item): confirm the four experiment metrics flow through PostHog (installed) and whether new events are required — answer in Pre-flight; file a follow-up if instrumentation is needed.
- **Spec on `main`:** ensure `docs/superpowers/specs/2026-07-03-unified-quest-presence-design.md` (currently on `chore/lint-ci-green`) reaches `main` before or with this feature.
- **`expo-audio` SDK-52 support** (Task 1): if it requires SDK 53+, this whole plan re-sequences behind an Expo upgrade — a human decision.
