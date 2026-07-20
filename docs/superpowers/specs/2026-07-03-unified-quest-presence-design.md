# Unified Quest Presence — Design

**Date:** 2026-07-03
**Status:** Approved in design review (brainstorming session)
**Repos affected:** `unquest` (mobile, primary), `unquest-server` (backend)

## Summary

Emberglow today ships "hard mode" only: a quest starts when the user locks their phone, and unlocking early fails it. This design replaces the solo quest flow with a **unified presence model**: every solo quest starts immediately on tap, with the phone open on a new in-app progress screen. Staying in the app keeps the quest alive; locking the phone at any point continues the quest in "hard mode" and earns bonus XP; switching to another app starts a short grace countdown, and overstaying fails the quest.

There is **no mode toggle**. Easy mode and hard mode are not choices the user makes up front — the app infers them from behavior, and bonus XP makes locking self-motivating.

**Motivation:** retention. The app struggles to make usage a daily habit, and the hypothesis is that "lock your phone or nothing" is too high a barrier. Framing: *"Focus on your work while your hero goes on an adventure"* — the phone becomes a desk companion showing live progress, ambient music optional but included (previously requested by a user).

## Product behavior (UX contract)

### Quest lifecycle

1. **Start:** tapping Start Quest immediately begins the quest and lands on the active-quest screen. The solo "lock your phone to begin" pending screen is retired.
2. **IN_APP (watching):** countdown runs; XP accrues at 1×. The screen is held awake (`expo-keep-awake`) so it never idle-dims; locking stays an explicit act.
3. **LOCKED (hard mode):** locking the phone from the screen (or anywhere) continues the quest; locked time accrues bonus XP. Existing lock-mode surfaces (iOS Live Activity, Android foreground-service notification) keep showing the countdown.
4. **AWAY (grace):** leaving the app without locking (app switch, answered call, notification tap) starts a **30-second grace countdown** and fires a local warning notification (~3s after leaving, so instant switch-backs never see it): *"⚠️ Your hero is in danger! Return to Emberglow or lock your phone."* Returning or locking rescues the quest; the away time simply doesn't count as locked time.
5. **Fail:** grace expires → quest fails with reason `left_app`.
6. **Complete:** duration elapses while the quest is still live → quest completes.

**Deadlines are judged chronologically.** When grace expiry and quest completion both lie in the past (a late return, a cold start), whichever came first in wall-clock time wins: grace deadline before quest end → FAILED; quest end before grace deadline → COMPLETED (e.g. the app crashed 10 seconds before a 30-minute quest finished). This one rule applies identically to warm returns and cold starts — see Edge cases.

Unlocking the phone no longer fails anything: `LOCKED → AWAY(grace) → IN_APP` happens naturally as the user unlocks back into the app.

### XP

`finalXP = baseXP × (1 + perkBonus + 0.5 × lockedFraction)`

- `lockedFraction` = locked milliseconds ÷ total quest duration. Locked segments are **clipped to the quest window** — a segment still open at `scheduledEndTime` is capped there — so `lockedFraction ≤ 1` always. Fully locked = 1.5× (hard mode keeps its edge), fully watched = 1×, every locked minute counts.
- The lock bonus stacks **additively** with perk bonuses, exactly as `streak_master`/`streak_god` already stack (`1.0 + totalBonus` in `perk.service.js`).
- Streaks are mode-blind: any completion counts.

### Active-quest screen

New screen, validated via mockups (see References): full-bleed **campfire ambience** (CSS-equivalent glow, blurred flame core, drifting embers — no emoji) with this data hierarchy:

- Quest chip (e.g. "Chapter 3 · Story") + quest title, top-left
- Info strip borrowed from the pending-quest card: active perk chips and an XP forecast ("62 XP · up to 93 if locked") that updates live
- Large tabular countdown, center
- **Journey progress bar**: elapsed time rendered as a hero's journey — a circular player token (player portrait; lucide `user` icon as fallback) travels along the track toward a lucide `flag` at the goal; "21:19 travelled" left, live multiplier ("1.18× XP") right
- Ambient music pill with mute toggle
- Two-line footer, differentiated: line 1 bright/semibold with lock icon — "Lock your phone anytime — the quest continues"; line 2 dimmer/smaller — "Leaving the app will end the quest early"

### Ambient music

- New `quest-audio.service.ts` using **`expo-audio`** (not the deprecated `expo-av`): one looped ambient track in v1, delivered via S3 + the existing `audio-cache.service` (not bundled).
- Plays during IN_APP; fades out on leaving IN_APP; resumes on return. **No iOS background-audio entitlement in v1** — music stops when the phone locks.
- Mute state persists per user preference.

## Client architecture

### `quest-presence-machine.ts` (new, pure TypeScript)

The core of the design: a reducer `(state, event, now) → { state, effects }` with **no imports** from React Native, native modules, or timers. States: `IN_APP`, `LOCKED`, `AWAY`, `FAILED`, `COMPLETED`. Events (normalized platform signals):

| Event | iOS source | Android source |
|---|---|---|
| `APP_ACTIVE` / `APP_BACKGROUND` | RN `AppState` | RN `AppState` |
| `SCREEN_LOCKED` | `protectedDataWillBecomeUnavailable` (new native code) | existing `ACTION_SCREEN_OFF` |
| `SCREEN_UNLOCKED` | `protectedDataDidBecomeAvailable` | existing `ACTION_USER_PRESENT` |
| `GRACE_DEADLINE` / `TIMER_COMPLETE` | injected clock | injected clock |

Effects returned (executed by the runtime, never by the machine): arm/cancel grace deadline, schedule/cancel warning notification, PATCH lock status, report fail, report complete, persist snapshot.

The machine records state-entry timestamps and accumulates `lockedMs` per segment; the locked fraction is derived at completion.

**Deadline-first evaluation:** on *every* incoming event the machine first checks its armed deadlines against `now`, before honoring the event as a state signal. JS timers are suspended while backgrounded, so `GRACE_DEADLINE` frequently never fires in real time — the expiry is discovered by the next event (typically the `APP_ACTIVE` of a late return). A late `APP_ACTIVE` in `AWAY` with `now` past the grace deadline yields FAILED (or COMPLETED, if quest end came first — chronological rule); it must never rescue the quest.

**Robustness rule — "APP_ACTIVE wins on state, never on deadlines":** after deadline evaluation, `APP_ACTIVE` from any live state forces `IN_APP`. This absorbs platform *signal* quirks: Android with keyguard disabled never fires `ACTION_USER_PRESENT`; iOS protected-data signals can lag; unlock events can be missed. If the user is demonstrably in the app, believe it — about *where they are*, not about *how long they were gone*.

### Runtime & existing modules

- A single runtime (hooked in **one** place — fixing the current double-mount of `useLockStateDetection` in both `_layout.tsx` files) subscribes to AppState + the native module, feeds the machine, executes effects, and persists `{state, enteredAt, lockedMs}` to MMKV on every transition — plus a **`lastAliveAt`** timestamp refreshed on each countdown tick while IN_APP (a local MMKV write per second; cheap). `lastAliveAt` exists solely so cold-start judgment can anchor at the moment the app actually died rather than at state entry.
- **`modules/lock-state` (iOS)**: replace the background/foreground-as-lock behavior with true lock detection via protected-data observers. Known limitation, accepted: devices **without a passcode** never emit protected-data signals, so locking looks like AWAY and fails after grace — passcode-less iOS users can't earn the lock bonus (tiny population; all Face ID devices have passcodes). Android native code is already correct and unchanged.
- **`QuestTimer`** slims to orchestration: create server run, `/begin`, PATCH lock status, Live Activities, Android foreground service, completion notifications. All pass/fail decisions delegate to the machine. `prepareQuest` + lock-gated start merge into one immediate start.
- **Navigation:** `navigation-state-resolver.ts` gains the `activeQuest → /active-quest` case (it has none today, because during a lock-mode quest the phone is locked). New screen at `src/app/active-quest.tsx` with components under `src/app/active-quest/components/` (`campfire-ambience`, `journey-progress-bar`, `countdown-display`, info strip, footer). The screen renders machine state via a `useQuestPresence()` hook; it never computes decisions.
- Add the new mode handling to the existing type unions and helpers only where required (`src/store/types.ts`, `src/api/quest/types.ts`, `getQuestModeLabel`) — note the quest *template* modes (`story`/`custom`) are unchanged; presence is a property of the run, not the template.

## Server changes (`unquest-server`)

All changes are additive; old clients are unaffected. Read `docs/plans/2026-04-30-mongoose-documentdb-upgrade.md` before touching models.

1. **`PATCH /quest-runs/:id/begin` (new):** activates a solo run without a lock — sets `status: 'active'`, `actualStartTime`, `scheduledEndTime`, schedules the completion job. Marks the run `enforcement: 'presence'`.
2. **`enforcement: 'presence' | 'lock'` (new field, default `'lock'`):** discriminates the rule set. `'lock'` runs follow every existing code path (old clients keep working; existing tests must keep passing unmodified).
3. **Lock accounting:** for `'presence'` runs, the existing phone-lock-status PATCH on `locked: false` **accumulates** `participant.lockedDurationMs += now − phoneLockedAt` instead of failing the quest. The completion job adds any final still-locked remainder. Lock segments are server-timestamped, so the bonus is not client-spoofable.
4. **Claim-based completion (anti-abandonment):** when the completion job fires for a `'presence'` run:
   - Participant `phoneLocked === true` → complete and award immediately, as today. The lock is server-verified, and a locked phone cannot confirm anything.
   - Otherwise → set the run to **`awaiting_confirmation`** instead of completing. The client confirms on its next contact: a user actually watching confirms within seconds (`TIMER_COMPLETE` fires in the foregrounded app → PATCH complete → server completes and awards); a user who abandoned the quest and returns later re-judges chronologically, reports `failed`/`left_app`, and the run fails with no XP; a user who **never returns** leaves the run unconfirmed and unawarded forever. The confirm PATCH is valid from `awaiting_confirmation` *and* from `active` gated on server-clock `now ≥ scheduledEndTime` — a watcher's `TIMER_COMPLETE` can race the completion job by a few seconds. This closes the "start a quest, go use Instagram, collect XP" loophole without heartbeat pings (considered and rejected: chatty, and background suspension makes them unreliable anyway).
5. **XP at completion:** for `'presence'` runs, both awarding paths (locked auto-complete and confirmed completion) recompute `finalXP = baseXP × (1 + perkBonus + 0.5 × lockedFraction)` — locked segments clipped to `scheduledEndTime` — and store `rewards.lockBonus` for the results screen.
6. **Fail path:** existing client-reported fail PATCH gains `failureReason: 'left_app'`; valid from `active` *and* `awaiting_confirmation`; cancels the scheduled completion job when one is pending.
7. **Schema deltas** (DocumentDB-safe additions): `questRun.enforcement`, `awaiting_confirmation` in the run-status enum, `participant.lockedDurationMs`, `participant.rewards.lockBonus`, `'left_app'` failure reason.

## Edge cases & failure handling

**Cold-start re-judgment** (force-quit, crash, OS kill — machine snapshot `{state, enteredAt, lockedMs, lastAliveAt}` in MMKV). The judgment is the same chronological deadline evaluation used on warm returns — one code path, cold start just feeds it the persisted snapshot instead of live state:

1. Snapshot state `LOCKED`: the app died in the background while the phone was locked (force-quitting requires unlocking first) — innocent. Credit the locked segment from `enteredAt` up to `min(now, scheduledEndTime)`. If quest end fell inside that locked span → **COMPLETED** (the server auto-completed it — locked at end; fetch run for rewards). Otherwise resume **IN_APP**. (This mildly over-credits lock time — the unlock-to-relaunch gap counts as locked on both client and server, since the unlock PATCH only arrives at relaunch. Bounded to seconds in practice and errs in the user's favor; accepted on **both** sides deliberately — do not "fix" it on one side only.)
2. Snapshot state `IN_APP`/`AWAY`: the effective grace deadline is `max(enteredAt, lastAliveAt) + 30s` — for a crash while IN_APP, `lastAliveAt` is within a tick of the crash, so the clock starts at the crash, not at state entry. Chronological rule: quest end before the deadline → **COMPLETED** (confirm to the server); deadline before `min(now, quest end)` → **FAILED** (`left_app`); neither elapsed → resume **IN_APP**.

A cold start after abandoning at minute 2 of a 30-minute quest is therefore FAILED even though the duration has long elapsed — the grace deadline came first. Combined with claim-based completion server-side, abandonment never pays: return → failed; never return → unconfirmed, no XP.

**Clock tampering & residual trust:** lock segments and `scheduledEndTime` are server-timestamped, so the lock *bonus* cannot be spoofed and nothing completes early. Client-side grace uses local time; a tamperer can only hurt themselves. One residual trust is accepted deliberately: for unlocked `'presence'` runs, completion is client-*confirmed* — a modified client could confirm without having watched. This is the same trust level as today's client-reported fails; heartbeat verification was considered and rejected (see Out of scope). Do not re-litigate during implementation.

**Offline mid-quest:** a lost `locked: true` PATCH under-counts locked time (lower bonus); a lost `locked: false` leaves the segment open until the completion job clips it at `scheduledEndTime` (over-count, in the user's favor). Both directions are benign and never wrongly fail a quest. An offline watcher's completion confirmation retries until connectivity returns (the run waits in `awaiting_confirmation` — nothing expires it). Accepted for v1; matches current offline behavior. v2 option: client-claimed segments reconciled with tolerance.

**Calls / notification taps:** anything that backgrounds the app without locking → AWAY → grace + warning. Tapping our warning notification returns and rescues. No special cases.

## Testing

- **Machine (Jest, TDD):** exhaustive table-driven tests over (state × event), grace timing with injected clock, deadline-first chronological evaluation (late-return rescue attempts, crash-just-before-completion, abandonment), `lockedMs` accounting with end-of-quest clipping, both cold-start rules. Zero native mocks.
- **Runtime/screen (Jest + RNTL):** adapter with mocked `lock-state`/`AppState` (existing mock patterns); screen renders from store state with `expo-keep-awake`/`expo-audio` mocked.
- **Server (Vitest, tdd-guard):** `/begin` activation; presence-run unlock accumulates instead of fails; completion computes `lockBonus` (0%, 100% via clipping, restart-mid-quest cases); claim-based completion (locked-at-end auto-completes and awards; unlocked-at-end parks in `awaiting_confirmation`; confirmation awards XP with lock bonus; `left_app` from `awaiting_confirmation` fails without award); `left_app` cancels a pending job; **existing lock-enforcement tests pass unmodified** (compat proof).
- **Device QA matrix (manual):** iOS with/without passcode; Android keyguard on/off; answered call mid-quest; force-quit in each state; OS kill during long lock.

## Rollout & measurement

1. **Server first** — additive, defaults to `'lock'`, invisible until a new client arrives.
2. **App update** replaces the solo flow outright (no in-app flag); store phased release (App Store phased / Play staged rollout) is the safety valve.
3. **Cooperative quests untouched** — phase B, after the `fix/issue-25-websocket-robustness` PR merges (its lobby/lock-gate code is exactly what phase B must rework).

**Experiment metrics:** solo quest completion rate, quests/user/week, D7 retention, and the locked-fraction distribution (are users using easy mode, or locking anyway?).

## Out of scope / deferred

- Cooperative quests (phase B, post issue-25 merge)
- Per-storyline music tracks; iOS background-audio entitlement (music under lock)
- Migrating `StoryNarration.tsx` off `expo-av`
- Offline lock-segment reconciliation
- Heartbeat pings for presence verification (considered, rejected in favor of claim-based completion: chatty, and background suspension makes them unreliable)
- A/B experiment flag (deliberately: full replacement, phased store rollout instead)

## Open items for the implementation plan

- **First task of the plan:** verify `expo-audio` availability on the app's pinned Expo SDK (`~52.0.47`); if it requires SDK 53+, sequence this behind the Expo upgrade or scope the upgrade in. This is resolved up front because it can resequence the whole effort.
- Confirm which analytics pipeline the experiment metrics flow through.

## References

- Mockups (v3 final + state-machine diagram): `/Users/thomasshellberg/Projects/unquest/unquest/.superpowers/brainstorm/8024-1783061626/` (`quest-screen-v3.html`, `state-machine.html`) — local-only, gitignored
- Server exploration anchors: solo activation `quest-run.controller.js:1291-1346`; scheduler completion `scheduler.service.js:24-236`; reward computation `perk.service.js:364-442`; participant schema `quest-run.model.js:66-106`
- Mobile exploration anchors: `quest-timer.ts` lifecycle (prepare `:153`, lock-start `:325`, unlock-judge `:579`); `modules/lock-state` native sources; `navigation-state-resolver.ts:9-19`
