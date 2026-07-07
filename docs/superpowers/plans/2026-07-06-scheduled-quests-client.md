# Scheduled Quests (Events) — Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the mobile client for scheduled quests ("Events" — public cooperative quests users register for ahead of time), plus the five small server prerequisites it needs on the still-unmerged `feat/scheduled-quests-v2` branch.

**Architecture:** Pre-start (discovery, create, lobby/countdown, roster) and settlement ("who showed up") are new, additive mobile surfaces backed by a slim Zustand store + TanStack Query. At T-0 the lobby's "Take part" action hands the already-active server run to the **existing** cooperative start machinery (`setCooperativeQuestRun` → `prepareQuest` → `QuestTimer.prepareQuest(template, questRunId)` → `/cooperative-pending-quest` → physical phone lock). Zero edits to `QuestTimer`, `useLockStateDetection`, or any quest-start internals — verified safe because `quest-timer.ts:464` anchors the local timer to the server's `actualStartTime` (T-0), so even a late lock-in counts down to the shared end time for free.

**Tech Stack:** Server: Node ≥20, Express, Mongoose 5.13, node-schedule, Socket.io, Vitest. Mobile: Expo SDK 52, expo-router, Zustand 4 + MMKV, TanStack Query 5, socket.io-client, NativeWind, Jest + RN Testing Library, `@react-native-community/datetimepicker`.

**Spec:** `docs/superpowers/specs/2026-07-06-scheduled-quests-client-design.md` (mobile repo)

---

## Before you start

Two repos are involved. Every task names its working directory explicitly.

- **Server repo:** `/Users/thomasshellberg/Projects/unquest/unquest-server`, branch **`feat/scheduled-quests-v2`** (already checked out, clean). Commit the Phase 0 prerequisites directly to this branch — it is unmerged, and the spec folds these deltas into it.
- **Mobile repo:** `/Users/thomasshellberg/Projects/unquest/unquest`. The main checkout is on `chore/lint-ci-green` with ~65 uncommitted files — **do not work there**. Task 7 creates a worktree `.worktrees/feat/scheduled-quests-mobile` off `main`; all mobile tasks run inside it.
- **MongoDB for server tests:** integration tests need the **native local mongod** on port 27017 (they only touch the `node-boilerplate-test` DB). **NEVER start a Docker mongo container** — the native mongod owns 27017 and holds the real `unquest` dev database. If tests can't connect, stop and ask the user; do not "fix" it by starting containers.
- **TDD is enforced by tooling on the server** (`tdd-guard-vitest` reporter in `vitest.config.js`): always write and RUN the failing test before touching implementation code. Follow the same discipline on mobile (@superpowers:test-driven-development).
- **Test commands:**
  - Server, single file: `npx cross-env NODE_ENV=test vitest run <path>`
  - Server, suites: `npm run test:unit`, `npm run test:integration`, everything: `npm test`
  - Mobile, single file: `pnpm test <path-substring>` (jest treats the arg as a filename pattern)
  - Mobile, everything: `pnpm check-all` (lint + type-check + tests)
- **Baselines first.** Both repos have known-failing baselines (server: flaky integration tests in `cooperative-quest`, `quest-invitation`, `quest-start-rewards`, `send-circle-discount-notification`; mobile: lint/type-check debt that `chore/lint-ci-green` is fixing). Record a baseline run before your first change in each repo and only compare against it — never chase pre-existing failures.
- **Lint/format only files you touch.** Never run repo-wide `prettier:fix` or `lint:fix`.
- **Commit rule:** NEVER add `Co-Authored-By: Claude` or any Claude-attribution trailer to commits — this applies to every commit in this plan and to any subagent you dispatch (pass the rule through in their prompts).
- **Worktree/test-runner gotcha (server):** vitest treats positional args as substring filters and has no exclude for `.worktrees/`. Run tests via the npm scripts from the repo root; if stray worktree test copies show up, add `--exclude '**/.worktrees/**'` — never delete another branch's worktree.

## Decisions made in this plan (ground-truth corrections & spec deviations)

| # | Decision | Why |
|---|----------|-----|
| D1 | **Fifth server prereq (E): `GET /quest-runs/scheduled/:questRunId`** detail endpoint, visibility-gated like discover, with populated roster | The spec's lobby is "backed by `GET /:id`", but the existing `getQuestRun` 404s for non-participants (`'participants.userId': req.user.id` in the query) and returns unpopulated ObjectIds — unusable for browsing an event pre-join or rendering names. |
| D2 | **Field-limit every roster populate** to `character.name character.type character.level` (discover + new endpoints) | The User schema has **no `private: true` fields** — a bare `populate('participants.userId')` serializes email, friends, and blockedUsers to strangers. Tests assert the absence of `email`. |
| D3 | Overlap guard runs at **create** as well as join | The creator auto-registers as `participants[0]`; guarding only join would let creation double-book. |
| D4 | **One state-switched route `scheduled-quest/[id]`** renders lobby / take-part / results / cancelled from the *fetched* run; no separate results route | `quest:settled` is emitted to the questRun room only and there is **no settlement push** — anyone with the app closed at Tend must be able to open the event later and see results from a plain fetch. |
| D5 | Slim store (`myRegistrations` + `settlements` only); TanStack Query owns discovery/detail caches | Matches the repo's newest convention (`guild-store.ts` header: "Server data … is managed by TanStack Query hooks") while honoring the spec's user-confirmed "dedicated store, quest-store untouched" decision. Deliberate narrowing: the spec's "re-fetch on launch/foreground" becomes `refetchOnMount: 'always'` on any consuming screen — bounded staleness, no global AppState listener (YAGNI). |
| D6 | Roster socket events trigger **query invalidation (refetch)**, not surgical upserts | `quest:participant-joined/left` carry only `{questRunId, userId, participantCount}` — no display data to upsert. |
| D7 | `scheduled_quest_cancelled` push routes to the event screen (which shows the cancelled state) | Spec offered "lobby (shows cancelled) or discovery + toast"; the state-switched route makes the first option free and consistent. |
| D8 | New `RosterRow` component; the orphaned `(app)/quest-discovery.tsx` stays untouched | `ParticipantRow` is a private component inside `cooperative-quest-lobby/[lobbyId].tsx`; nothing navigates to the orphan screen — borrow only the *visual design* of the "Coming Soon" mock card. |
| D9 | Handoff template mirrors the ready screen's literal exactly: `mode: 'cooperative', category: 'cooperative'` (localized cast) | `navigation-state-resolver.ts:156` decides cooperativeness by `pendingQuest.mode === 'cooperative'` **only** — any other mode makes the NavigationGate push the solo `/pending-quest` screen if the app relaunches/foregrounds while armed. Both existing coop paths produce this literal at runtime, so behavior-correctness beats the `CustomQuestTemplate.mode: 'custom'` type friction: build the template with `mode: 'cooperative'` behind one commented `as unknown as CustomQuestTemplate` cast. Do NOT "fix" this by editing the resolver — it's out of scope and #324 touches it. |
| D10 | Accepted residual: if the lock PATCH exhausts its 3 retries, `QuestTimer` still starts locally on the run-active check → server settles that user `no_show` while the client shows a run | Fixing it means editing `QuestTimer`, which the spec forbids; classic coop already carries the same-shaped risk. Documented, not handled. |
| D11 | No ready-up anywhere in the client (spec §6); server `ready` / `lobby:ready-status` unused | Its only purpose was auto-start, impossible under the physical-lock invariant. |
| D12 | Create screen mirrors the 15-min lead floor, relaxed to 10 s when `__DEV__` | Matches the server's dev relaxation (`scheduled-quest.controller.js:38`) so the full lifecycle stays testable in development. |
| D13 | "My events" = runs where **my participant status is `active`** in a `pending`/`active` scheduled run | Left/kicked participants are `$pull`ed; a `failed` participant's commitment is over — the event drops to detail-screen access only. |
| D14 | Client never renders discover's `totalResults`/`totalPages` | Known in-code limitation: the in-memory fullness filter makes totals page-local. |
| D15 | Cutoff error copy becomes "the join window has closed" | "less than half the quest remains" is false once the cutoff is 25%. |

## File structure

**Server (all modified, no new files):**
| Path | Change |
|---|---|
| `src/utils/scheduled-quest-scoring.js` | 25% cutoff, flat XP, delete grace/proration |
| `tests/unit/utils/scheduled-quest-scoring.test.js` | Rewritten expectations |
| `src/services/scheduled-quest.service.js` | + `findOverlappingRegistration` |
| `src/controllers/scheduled-quest.controller.js` | Overlap guard (create+join), + `getMyScheduledQuests`, + `getScheduledQuest`, discover rework, message updates |
| `src/routes/v1/quest-run.route.js` | + `GET /scheduled/mine`, + `GET /scheduled/:questRunId` |
| `src/controllers/quest-run.controller.js` | Lock-in cutoff message (line ~1075) |
| `tests/integration/scheduled-quest.test.js` | New cases + updated scoring expectations |
| `tests/unit/services/scheduled-quest.service.test.js` | Overlap helper cases |
| `scripts/scheduled-quest-probe.js` | Align any 50%/proration references |

**Mobile (in the worktree; N=new, M=modified):**
| Path | Responsibility |
|---|---|
| N `src/features/scheduled-quests/types.ts` | `ScheduledQuestRun` types, join-window + overlap helpers |
| N `src/features/scheduled-quests/lib/participants.ts` | Populated-or-raw participant accessors |
| N `src/features/scheduled-quests/lib/validate-event-form.ts` | Pure create-form validation (lead floor/ceiling) |
| N `src/lib/services/scheduled-quest-service.ts` | REST calls (provisional-aware) |
| N `src/store/scheduled-quests-store.ts` | `myRegistrations`, `settlements` (persisted) |
| N `src/api/scheduled-quests/use-*.ts` | Query hooks + mutations |
| N `src/features/scheduled-quests/hooks/use-scheduled-quest-room.ts` | Scoped WebSocket room hook |
| N `src/features/scheduled-quests/hooks/use-take-part.ts` | T-0 handoff |
| N `src/features/scheduled-quests/components/{event-card,roster-row,results-view,cancelled-view}.tsx` | UI pieces |
| N `src/app/scheduled-quest/{index,create,[id]}.tsx` | Screens |
| M `src/lib/services/websocket-events.types.ts` | Additive payload/event types |
| M `src/store/types.ts` | + optional `completionPolicy` on `CooperativeQuestRun` |
| M `src/app/_layout.tsx` | Route registration + push-type routing branches |
| M `src/app/cooperative-pending-quest.tsx` | Conditional lock copy (individual policy only) |
| M `src/app/cooperative-quest-menu.tsx` | "Public Events" menu entry |
| M `src/app/join-cooperative-quest.tsx` | Replace Coming-Soon mock with live entry |

Every new file gets a co-located `*.test.ts(x)`.

---

# Phase 0 — Server prerequisites

All Phase 0 tasks: `cd /Users/thomasshellberg/Projects/unquest/unquest-server` on branch `feat/scheduled-quests-v2`.

### Task 1: Record the server baseline

- [ ] **Step 1:** `git status` — confirm clean, on `feat/scheduled-quests-v2`.
- [ ] **Step 2:** `npm test 2>&1 | tail -40` — record which tests fail (expect only the known flaky baseline). Save the list; you'll compare against it in Task 6.

### Task 2: Scoring simplification — 25% cutoff, flat XP (spec §10-C)

**Files:**
- Test: `tests/unit/utils/scheduled-quest-scoring.test.js` (rewrite)
- Modify: `src/utils/scheduled-quest-scoring.js`
- Modify: `src/controllers/scheduled-quest.controller.js:88,101` (comment + message)
- Modify: `src/controllers/quest-run.controller.js:~1075` (message)
- Modify: `tests/integration/scheduled-quest.test.js` (expectations)

- [ ] **Step 1: Rewrite the unit tests** to the new rules. Replace the body of `tests/unit/utils/scheduled-quest-scoring.test.js` with (keep the existing `describe` file header style):

```js
const {
  JOIN_WINDOW_FRACTION,
  classifyParticipant,
  computeAwardedXP,
  lateJoinCutoff,
  isLockInAllowed,
} = require('../../../src/utils/scheduled-quest-scoring');

describe('scheduled-quest-scoring', () => {
  const startAt = new Date('2030-01-01T05:00:00Z');

  describe('classifyParticipant', () => {
    it('failed stays failed', () => {
      expect(classifyParticipant({ status: 'failed', phoneLocked: true, phoneLockedAt: startAt })).toBe('failed');
    });
    it('locked participant is completed', () => {
      expect(classifyParticipant({ status: 'active', phoneLocked: true, phoneLockedAt: startAt })).toBe('completed');
    });
    it('never-locked participant is no_show', () => {
      expect(classifyParticipant({ status: 'active', phoneLocked: false })).toBe('no_show');
    });
  });

  describe('lateJoinCutoff / isLockInAllowed (25% window)', () => {
    it('exports the window fraction as 0.25', () => {
      expect(JOIN_WINDOW_FRACTION).toBe(0.25);
    });
    it('cutoff for a 60-minute quest is T+15', () => {
      expect(lateJoinCutoff(startAt, 60).getTime()).toBe(startAt.getTime() + 15 * 60 * 1000);
    });
    it('allows lock-in exactly at the cutoff', () => {
      const at = new Date(startAt.getTime() + 15 * 60 * 1000);
      expect(isLockInAllowed(at, startAt, 60)).toBe(true);
    });
    it('rejects lock-in one ms past the cutoff', () => {
      const at = new Date(startAt.getTime() + 15 * 60 * 1000 + 1);
      expect(isLockInAllowed(at, startAt, 60)).toBe(false);
    });
    it('rejects at 30% elapsed (allowed under the old 50% rule)', () => {
      const at = new Date(startAt.getTime() + 18 * 60 * 1000);
      expect(isLockInAllowed(at, startAt, 60)).toBe(false);
    });
  });

  describe('computeAwardedXP (flat, no proration)', () => {
    it('awards the stored adjustedXP when present', () => {
      expect(computeAwardedXP({ baseXP: 180, adjustedXP: 216 })).toBe(216);
    });
    it('falls back to baseXP when rewards were never calculated', () => {
      expect(computeAwardedXP({ baseXP: 180, adjustedXP: null })).toBe(180);
    });
    it('ignores lock timing entirely - a cutoff lock-in earns full XP', () => {
      expect(
        computeAwardedXP({
          baseXP: 180,
          adjustedXP: null,
          phoneLockedAt: new Date(startAt.getTime() + 14 * 60 * 1000),
          scheduledStartAt: startAt,
          expiresAt: new Date(startAt.getTime() + 60 * 60 * 1000),
          durationMinutes: 60,
        })
      ).toBe(180);
    });
  });
});
```

- [ ] **Step 2: Run — verify it fails.**
  `npx cross-env NODE_ENV=test vitest run tests/unit/utils/scheduled-quest-scoring.test.js`
  Expected: FAIL — `JOIN_WINDOW_FRACTION` undefined; cutoff is T+30 not T+15; XP prorated.

- [ ] **Step 3: Implement.** Replace `src/utils/scheduled-quest-scoring.js` with:

```js
/**
 * Pure scoring rules for scheduled quests ("forgiving mode").
 * Spec: docs/superpowers/specs/2026-07-06-scheduled-quests-client-design.md §8
 * (supersedes the server spec's decision #4 hybrid): join/lock-in is allowed
 * through the first quarter of the run; anyone locked in by the cutoff who
 * holds to Tend earns full XP. No grace window, no proration.
 */

const JOIN_WINDOW_FRACTION = 0.25;

/**
 * Settlement classification for one participant of an individual-policy run.
 * @param {Object} participant - QuestRun participant subdocument (or POJO)
 * @returns {'completed'|'failed'|'no_show'}
 */
const classifyParticipant = (participant) => {
  if (participant.status === 'failed') return 'failed';
  if (participant.phoneLocked && participant.phoneLockedAt) return 'completed';
  return 'no_show';
};

/**
 * Latest moment a user may join or lock in: 25% of the duration elapsed.
 */
const lateJoinCutoff = (scheduledStartAt, durationMinutes) =>
  new Date(new Date(scheduledStartAt).getTime() + durationMinutes * 60 * 1000 * JOIN_WINDOW_FRACTION);

const isLockInAllowed = (now, scheduledStartAt, durationMinutes) =>
  now.getTime() <= lateJoinCutoff(scheduledStartAt, durationMinutes).getTime();

/**
 * XP for a participant classified `completed`: the full pipeline value
 * (stored adjustedXP, or baseXP when rewards were never calculated).
 * Extra timing fields passed by callers are deliberately ignored.
 */
const computeAwardedXP = ({ baseXP, adjustedXP }) => (adjustedXP != null ? adjustedXP : baseXP);

module.exports = { JOIN_WINDOW_FRACTION, classifyParticipant, computeAwardedXP, lateJoinCutoff, isLockInAllowed };
```

- [ ] **Step 4: Run — verify it passes.** Same command as Step 2. Expected: PASS.

- [ ] **Step 5: Sweep the dead references.** `grep -rn "GRACE_WINDOW_MS\|less than half\|prorat" src tests scripts`
  Fix every hit:
  - `src/controllers/scheduled-quest.controller.js:88` (comment) → "Post-start: late join inside the 25% window…"
  - `src/controllers/scheduled-quest.controller.js:101` → message `'Too late to join - the join window has closed'`
  - `src/controllers/quest-run.controller.js:~1075` → message `'Too late to lock in - the join window has closed'`
  - Any `GRACE_WINDOW_MS` importer (expected: only the old unit tests, already rewritten; if `scheduled-quest.service.js` imports it, drop the import — settlement's `computeAwardedXP` call keeps working since extra args are ignored).
  - `scripts/scheduled-quest-probe.js`: update any 50%-cutoff/proration copy so the manual probe describes the new rules.

- [ ] **Step 6: Update integration expectations.**
  `npx cross-env NODE_ENV=test vitest run tests/integration/scheduled-quest.test.js`
  Every failure should be a deliberate semantics change. Update the cases per this mapping — nothing else:
  - joins/lock-ins between 25% and 50% elapsed: **were allowed → now rejected 400** with the new message;
  - prorated-XP assertions: **now full XP** (`adjustedXP ?? baseXP`);
  - grace-window (T+5) cases: same award as before (full), only via the new rule;
  - assertions on the exact old error strings: new strings.
  Re-run until green.

- [ ] **Step 7: Full unit suite.** `npm run test:unit` — expected: PASS.

- [ ] **Step 8: Commit.**
```bash
git add src/utils/scheduled-quest-scoring.js src/controllers scripts/scheduled-quest-probe.js tests
git commit -m "feat: simplify scheduled-quest scoring to 25% window with flat XP"
```

### Task 3: Overlap guard at join and create (spec §9, §10-B)

**Files:**
- Test: `tests/integration/scheduled-quest.test.js` (new describe)
- Modify: `src/services/scheduled-quest.service.js` (+ helper, + export)
- Modify: `src/controllers/scheduled-quest.controller.js` (guard in create + join)

- [ ] **Step 1: Write the failing integration tests.** Add to `tests/integration/scheduled-quest.test.js`, using the file's existing helpers for users/tokens/scheduled-run creation (mirror the style of the existing join tests in that file):

```js
describe('overlap prevention', () => {
  it('rejects joining an event that overlaps an existing registration', async () => {
    // userA registered for [T+1h, T+2h); tries to join [T+1h30, T+2h30) -> 409
    const first = await createScheduledRun({ startInMinutes: 60, durationMinutes: 60 });
    await joinAs(userA, first.id).expect(200);
    const second = await createScheduledRun({ startInMinutes: 90, durationMinutes: 60 });
    const res = await joinAs(userA, second.id).expect(409);
    expect(res.body.message).toBe('You are already registered for an overlapping event');
  });

  it('allows joining an event that abuts but does not intersect', async () => {
    // [T+1h, T+2h) then [T+2h, T+3h) -> allowed (half-open windows)
    const first = await createScheduledRun({ startInMinutes: 60, durationMinutes: 60 });
    await joinAs(userA, first.id).expect(200);
    const second = await createScheduledRun({ startInMinutes: 120, durationMinutes: 60 });
    await joinAs(userA, second.id).expect(200);
  });

  it('rejects creating an event that overlaps an existing registration', async () => {
    const first = await createScheduledRun({ startInMinutes: 60, durationMinutes: 60 });
    await joinAs(userA, first.id).expect(200);
    await createScheduledRunAs(userA, { startInMinutes: 90, durationMinutes: 60 }).expect(409);
  });

  it('does not count registrations in cancelled or completed runs', async () => {
    const first = await createScheduledRun({ startInMinutes: 60, durationMinutes: 60 });
    await joinAs(userA, first.id).expect(200);
    await QuestRun.findByIdAndUpdate(first.id, { status: 'cancelled' });
    const second = await createScheduledRun({ startInMinutes: 60, durationMinutes: 60 });
    await joinAs(userA, second.id).expect(200);
  });
});
```

(Adapt helper names to whatever the file actually defines — the four behaviors and status codes are the contract.)

- [ ] **Step 2: Run — verify the new cases fail** (currently both join and create succeed):
  `npx cross-env NODE_ENV=test vitest run tests/integration/scheduled-quest.test.js -t 'overlap prevention'`

- [ ] **Step 3: Implement the service helper.** In `src/services/scheduled-quest.service.js`, below `hasActiveParticipation`:

```js
/**
 * Overlap rule (client spec §9): a user may not register for an event whose
 * run window [scheduledStartAt, scheduledStartAt + duration) intersects one
 * of their existing pending/active scheduled registrations. Durations live
 * inside the quest snapshot and a user holds few registrations, so a
 * fetch-and-check in JS beats an $expr query. Best-effort by design: two
 * concurrent joins can both pass; the one-active-participation rule still
 * guards actual lock-in.
 */
const findOverlappingRegistration = async (userId, startAt, durationMinutes, excludeQuestRunId = null) => {
  const newStart = new Date(startAt).getTime();
  const newEnd = newStart + durationMinutes * 60 * 1000;
  const filter = {
    scheduledStartAt: { $ne: null },
    status: { $in: ['pending', 'active'] },
    participants: { $elemMatch: { userId, status: 'active' } },
  };
  if (excludeQuestRunId) filter._id = { $ne: excludeQuestRunId };
  const candidates = await QuestRun.find(filter).select('scheduledStartAt quest.durationMinutes');
  return (
    candidates.find((run) => {
      const start = run.scheduledStartAt.getTime();
      const end = start + run.quest.durationMinutes * 60 * 1000;
      return newStart < end && start < newEnd;
    }) || null
  );
};
```

Add `findOverlappingRegistration` to the module exports.

- [ ] **Step 4: Wire the guard into the controller.** In `src/controllers/scheduled-quest.controller.js`:
  - In `createScheduledQuest`, after the MAX_LEAD check (line ~44):
```js
  const overlap = await scheduledQuestService.findOverlappingRegistration(userId, startAt, durationMinutes);
  if (overlap) {
    throw new ApiError(httpStatus.CONFLICT, 'You are already registered for an overlapping event');
  }
```
  - In `joinScheduledQuest`, after the not-found check (line ~98) and before the status branching:
```js
  const overlap = await scheduledQuestService.findOverlappingRegistration(
    userId,
    questRun.scheduledStartAt,
    questRun.quest.durationMinutes,
    questRunId
  );
  if (overlap) {
    throw new ApiError(httpStatus.CONFLICT, 'You are already registered for an overlapping event');
  }
```

- [ ] **Step 5: Run — verify pass.** Same command as Step 2. Expected: PASS. Then the whole file: `npx cross-env NODE_ENV=test vitest run tests/integration/scheduled-quest.test.js`.

- [ ] **Step 6: Commit.**
```bash
git add src/services/scheduled-quest.service.js src/controllers/scheduled-quest.controller.js tests/integration/scheduled-quest.test.js
git commit -m "feat: block overlapping scheduled-quest registrations at join and create"
```

### Task 4: `GET /quest-runs/scheduled/mine` (spec §10-A)

**Files:**
- Test: `tests/integration/scheduled-quest.test.js`
- Modify: `src/controllers/scheduled-quest.controller.js`, `src/routes/v1/quest-run.route.js`

- [ ] **Step 1: Failing integration tests:**

```js
describe('GET /v1/quest-runs/scheduled/mine', () => {
  it("returns the caller's pending and active scheduled registrations, soonest first", async () => {
    // arrange: userA in one pending future run, one active run; a run userA is NOT in;
    // and one completed run userA was in.
    const res = await request(app)
      .get('/v1/quest-runs/scheduled/mine')
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);
    expect(res.body.results).toHaveLength(2);
    const starts = res.body.results.map((r) => new Date(r.scheduledStartAt).getTime());
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    for (const run of res.body.results) {
      expect(['pending', 'active']).toContain(run.status);
      expect(run.participants.some((p) => p.userId && p.userId.id === userA.id)).toBe(true);
    }
  });

  it('populates roster display fields but never private user data', async () => {
    const res = await request(app)
      .get('/v1/quest-runs/scheduled/mine')
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);
    const populated = res.body.results[0].participants[0].userId;
    expect(populated.character).toBeDefined();
    expect(populated.character.name).toEqual(expect.any(String));
    expect(populated.email).toBeUndefined();
    expect(populated.friends).toBeUndefined();
  });

  it('returns an empty list when the caller has no registrations', async () => {
    const res = await request(app)
      .get('/v1/quest-runs/scheduled/mine')
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);
    expect(res.body.results).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — verify 404** (route doesn't exist; Express falls through to `GET /:questRunId` which casts `'scheduled'` and errors — either way, not 200).

- [ ] **Step 3: Implement the controller** (in `src/controllers/scheduled-quest.controller.js`):

```js
/**
 * GET /v1/quest-runs/scheduled/mine
 * The caller's live registrations: pending (upcoming) and active (running)
 * scheduled runs where their own participant entry is still 'active'.
 * Settled/cancelled runs drop out - the client renders those from the
 * detail endpoint.
 */
const getMyScheduledQuests = catchAsync(async (req, res) => {
  const userId = req.user.id.toString();
  const runs = await QuestRun.find({
    scheduledStartAt: { $ne: null },
    status: { $in: ['pending', 'active'] },
    participants: { $elemMatch: { userId, status: 'active' } },
  })
    .sort({ scheduledStartAt: 1 })
    .populate({ path: 'participants.userId', select: 'character.name character.type character.level' });
  res.send({ results: runs.map((r) => r.toJSON()) });
});
```

Add `getMyScheduledQuests` to `module.exports`.

- [ ] **Step 4: Register the route.** In `src/routes/v1/quest-run.route.js`, directly after the `'/scheduled'` block (line ~24) — **must come before any `/scheduled/:questRunId` route (Task 5) and stays above `'/:questRunId'`**:

```js
router.route('/scheduled/mine').get(auth('getQuests'), scheduledQuestController.getMyScheduledQuests);
```

(No `validate()` — the endpoint takes no params/query/body.)

- [ ] **Step 5: Run — verify pass**, then commit:
```bash
git add src/controllers/scheduled-quest.controller.js src/routes/v1/quest-run.route.js tests/integration/scheduled-quest.test.js
git commit -m "feat: add GET /quest-runs/scheduled/mine for registration lists"
```

### Task 5: `GET /quest-runs/scheduled/:questRunId` detail endpoint (plan D1)

**Files:**
- Test: `tests/integration/scheduled-quest.test.js`
- Modify: `src/controllers/scheduled-quest.controller.js`, `src/routes/v1/quest-run.route.js`

- [ ] **Step 1: Failing integration tests:**

```js
describe('GET /v1/quest-runs/scheduled/:questRunId', () => {
  it('lets a non-participant view a public event with a populated roster', async () => {
    const run = await createScheduledRun({ visibility: 'public' }); // created by userA
    const res = await request(app)
      .get(`/v1/quest-runs/scheduled/${run.id}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);
    expect(res.body.id).toBe(run.id);
    const creator = res.body.participants[0].userId;
    expect(creator.character.name).toEqual(expect.any(String));
    expect(creator.email).toBeUndefined();
  });

  it('hides a friends-visibility event from non-friends (404, not 403)', async () => {
    const run = await createScheduledRun({ visibility: 'friends' }); // creator userA; userB not a friend
    await request(app)
      .get(`/v1/quest-runs/scheduled/${run.id}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(404);
  });

  it('shows a friends-visibility event to a friend of the creator', async () => {
    // arrange: userC is in userA.friends
    const run = await createScheduledRun({ visibility: 'friends' });
    await request(app)
      .get(`/v1/quest-runs/scheduled/${run.id}`)
      .set('Authorization', `Bearer ${userCToken}`)
      .expect(200);
  });

  it('still serves a completed run to a participant (results screen)', async () => {
    const run = await createScheduledRun({});
    await QuestRun.findByIdAndUpdate(run.id, { status: 'completed', completedAt: new Date() });
    const res = await request(app)
      .get(`/v1/quest-runs/scheduled/${run.id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);
    expect(res.body.status).toBe('completed');
  });

  it('404s for a non-scheduled run id', async () => {
    const classic = await createClassicRun();
    await request(app)
      .get(`/v1/quest-runs/scheduled/${classic.id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(404);
  });
});
```

- [ ] **Step 2: Run — verify failures.**

- [ ] **Step 3: Implement the controller:**

```js
/**
 * GET /v1/quest-runs/scheduled/:questRunId
 * Event detail for the lobby/results screens. Unlike the generic
 * GET /:questRunId (participants only, unpopulated), this is visibility-
 * gated like discover and returns a display-ready roster. Participants can
 * always view (including after settlement); non-participants see public
 * events, or friends-visibility events when they're a friend of the
 * creator. Invisible events 404 rather than 403 to avoid existence leaks.
 * Kicked users may still view; the join guard keeps them out.
 */
const getScheduledQuest = catchAsync(async (req, res) => {
  const { questRunId } = req.params;
  const userId = req.user.id.toString();

  const questRun = await QuestRun.findOne({ _id: questRunId, scheduledStartAt: { $ne: null } }).populate({
    path: 'participants.userId',
    select: 'character.name character.type character.level',
  });
  if (!questRun) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Scheduled quest not found');
  }

  const participantId = (p) => p.userId && (p.userId._id ? p.userId._id.toString() : p.userId.toString());
  const isParticipant = questRun.participants.some((p) => participantId(p) === userId);
  if (!isParticipant && questRun.visibility !== 'public') {
    const user = await User.findById(userId).select('friends');
    const friendIds = ((user && user.friends) || []).map((id) => id.toString());
    const creatorId = questRun.participants[0] && participantId(questRun.participants[0]);
    if (!creatorId || !friendIds.includes(creatorId)) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Scheduled quest not found');
    }
  }
  res.send(questRun.toJSON());
});
```

Add to `module.exports`.

- [ ] **Step 4: Register the route** in `src/routes/v1/quest-run.route.js`, **after** `'/scheduled/mine'` and before `'/highest-completed-quest'`:

```js
router
  .route('/scheduled/:questRunId')
  .get(auth('getQuests'), validate(questRunValidation.getQuestRun), scheduledQuestController.getScheduledQuest);
```

- [ ] **Step 5: Run — verify pass**, run the whole integration file, then commit:
```bash
git add src/controllers/scheduled-quest.controller.js src/routes/v1/quest-run.route.js tests/integration/scheduled-quest.test.js
git commit -m "feat: add visibility-gated scheduled-quest detail endpoint with populated roster"
```

### Task 6: Widen `/discover` to the join window + close the populate leak (spec §10-D, plan D2)

**Files:**
- Test: `tests/integration/scheduled-quest.test.js`
- Modify: `src/controllers/scheduled-quest.controller.js` (`discoverScheduledQuests`)

- [ ] **Step 1: Failing integration tests:**

```js
describe('discover - join-window and populate hygiene', () => {
  it('includes an active run still inside the 25% join window', async () => {
    const run = await createScheduledRun({ durationMinutes: 60, visibility: 'public' });
    await QuestRun.findByIdAndUpdate(run.id, {
      status: 'active',
      scheduledStartAt: new Date(Date.now() - 5 * 60 * 1000), // T+5 of 60 -> inside window
      expiresAt: new Date(Date.now() + 55 * 60 * 1000),
    });
    const res = await request(app).get('/v1/quest-runs/discover').set('Authorization', `Bearer ${userBToken}`).expect(200);
    expect(res.body.results.map((r) => r.id)).toContain(run.id);
  });

  it('excludes an active run past the join window', async () => {
    const run = await createScheduledRun({ durationMinutes: 60, visibility: 'public' });
    await QuestRun.findByIdAndUpdate(run.id, {
      status: 'active',
      scheduledStartAt: new Date(Date.now() - 20 * 60 * 1000), // T+20 of 60 -> past 25%
      expiresAt: new Date(Date.now() + 40 * 60 * 1000),
    });
    const res = await request(app).get('/v1/quest-runs/discover').set('Authorization', `Bearer ${userBToken}`).expect(200);
    expect(res.body.results.map((r) => r.id)).not.toContain(run.id);
  });

  it('never exposes private user fields in the populated roster', async () => {
    await createScheduledRun({ visibility: 'public' });
    const res = await request(app).get('/v1/quest-runs/discover').set('Authorization', `Bearer ${userBToken}`).expect(200);
    const populated = res.body.results[0].participants[0].userId;
    expect(populated.character.name).toEqual(expect.any(String));
    expect(populated.email).toBeUndefined();
    expect(populated.friends).toBeUndefined();
    expect(populated.blockedUsers).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — verify** the window cases fail (active runs absent today) and the hygiene case fails (email present).

- [ ] **Step 3: Implement.** Replace the body of `discoverScheduledQuests` in `src/controllers/scheduled-quest.controller.js`:

```js
const discoverScheduledQuests = catchAsync(async (req, res) => {
  const userId = req.user.id.toString();
  const user = await User.findById(userId).select('friends');
  const friendIds = (user && user.friends) || [];

  const now = new Date();
  const filter = {
    kickedUsers: { $ne: userId },
    'participants.userId': { $ne: userId },
    $and: [
      { $or: [{ visibility: 'public' }, { visibility: 'friends', 'participants.0.userId': { $in: friendIds } }] },
      {
        $or: [
          { status: 'pending', scheduledStartAt: { $gt: now } },
          // Started but possibly still inside the 25% join window. The exact
          // cutoff depends on per-document duration, so it's re-checked in
          // JS below; expiresAt > now just bounds the candidate set.
          { status: 'active', scheduledStartAt: { $ne: null }, expiresAt: { $gt: now } },
        ],
      },
    ],
  };
  if (req.query.category) {
    filter['quest.category'] = req.query.category;
  }

  const options = {
    sortBy: 'scheduledStartAt:asc',
    limit: req.query.limit || 20,
    page: req.query.page || 1,
  };

  const result = await QuestRun.paginate(filter, options);
  // Fullness and the per-duration join cutoff can't go in the query without
  // $expr - filter the page in memory.
  // KNOWN LIMITATION: totalResults/totalPages become page-local counts after
  // this filter; do not trust them for multi-page pagination UI.
  result.results = result.results.filter(
    (questRun) =>
      !questRun.isFull() &&
      (questRun.status === 'pending' || isLockInAllowed(now, questRun.scheduledStartAt, questRun.quest.durationMinutes))
  );
  // Populate outside paginate so the roster is field-limited: User has no
  // `private` schema fields, so a bare populate would leak email/friends.
  await QuestRun.populate(result.results, {
    path: 'participants.userId',
    select: 'character.name character.type character.level',
  });
  result.totalResults = result.results.length;
  result.totalPages = Math.ceil(result.totalResults / options.limit);

  res.send(result);
});
```

- [ ] **Step 4: Run — verify pass**, plus any pre-existing discover tests in the file (update any that asserted a populated `email`).

- [ ] **Step 5: Full server verification.** `npm test` — compare against the Task 1 baseline; only the known flaky set may differ. Lint the touched files only:
  `npx eslint src/utils/scheduled-quest-scoring.js src/services/scheduled-quest.service.js src/controllers/scheduled-quest.controller.js src/routes/v1/quest-run.route.js`

- [ ] **Step 6: Commit and push the branch.**
```bash
git add src/controllers/scheduled-quest.controller.js tests/integration/scheduled-quest.test.js
git commit -m "feat: surface joinable active runs in discover; field-limit roster populate"
git push origin feat/scheduled-quests-v2
```

---

# Phase 1 — Mobile client

All mobile tasks run in the worktree created in Task 7:
`cd /Users/thomasshellberg/Projects/unquest/unquest/.worktrees/feat/scheduled-quests-mobile`

### Task 7: Worktree, baseline, docs

- [ ] **Step 1: Create the worktree off `main`:**
```bash
cd /Users/thomasshellberg/Projects/unquest/unquest
git worktree add .worktrees/feat/scheduled-quests-mobile -b feat/scheduled-quests-mobile main
cd .worktrees/feat/scheduled-quests-mobile
pnpm install
```
- [ ] **Step 2: Record the baseline.** `pnpm check-all 2>&1 | tail -30` — main is expected to have lint/type debt (that's what `chore/lint-ci-green` is fixing). Save the failure list; later tasks must add **no new** failures beyond it.
- [ ] **Step 3: Bring the docs in.** Copy the spec and this plan from the main checkout into the worktree (same paths under `docs/superpowers/…`), then:
```bash
git add docs/superpowers/specs/2026-07-06-scheduled-quests-client-design.md docs/superpowers/plans/2026-07-06-scheduled-quests-client.md
git commit -m "docs: add scheduled-quests client spec and implementation plan"
```

### Task 8: Types, pure helpers, WebSocket payload types

**Files:**
- Create: `src/features/scheduled-quests/types.ts`, `src/features/scheduled-quests/types.test.ts`, `src/features/scheduled-quests/lib/participants.ts`, `src/features/scheduled-quests/lib/participants.test.ts`
- Modify: `src/lib/services/websocket-events.types.ts`

- [ ] **Step 1: Write the failing helper tests** — `src/features/scheduled-quests/types.test.ts`:

```ts
import { isJoinable, joinCutoffMs, overlapsWindow } from './types';

const run = (startISO: string, durationMinutes: number, status: 'pending' | 'active' = 'pending') =>
  ({
    id: 'r1',
    status,
    scheduledStartAt: startISO,
    quest: { title: 't', category: 'fitness', durationMinutes, mode: 'cooperative', reward: { xp: 180 } },
    participants: [],
    completionPolicy: 'individual',
    visibility: 'public',
    maxParticipants: 10,
  }) as any;

describe('join window helpers', () => {
  const start = '2030-01-01T05:00:00.000Z';
  const startMs = new Date(start).getTime();

  it('cutoff is 25% of the duration after start', () => {
    expect(joinCutoffMs(run(start, 60))).toBe(startMs + 15 * 60_000);
  });
  it('pending runs are always joinable', () => {
    expect(isJoinable(run(start, 60, 'pending'), startMs + 999 * 60_000)).toBe(true);
  });
  it('active runs are joinable up to the cutoff and not after', () => {
    expect(isJoinable(run(start, 60, 'active'), startMs + 15 * 60_000)).toBe(true);
    expect(isJoinable(run(start, 60, 'active'), startMs + 15 * 60_000 + 1)).toBe(false);
  });
});

describe('overlapsWindow', () => {
  const a = run('2030-01-01T05:00:00.000Z', 60);
  it('detects intersecting windows', () => {
    expect(overlapsWindow(a, run('2030-01-01T05:30:00.000Z', 60))).toBe(true);
  });
  it('treats abutting windows as non-overlapping (half-open)', () => {
    expect(overlapsWindow(a, run('2030-01-01T06:00:00.000Z', 60))).toBe(false);
  });
});
```

And `src/features/scheduled-quests/lib/participants.test.ts`:

```ts
import { participantDisplayName, participantUserId } from './participants';

describe('participant accessors', () => {
  const populated = {
    userId: { id: 'u1', character: { name: 'Thorin', type: 'knight', level: 4 } },
    ready: false,
    phoneLocked: false,
    status: 'active',
  } as any;
  const raw = { userId: 'u2', ready: false, phoneLocked: false, status: 'active' } as any;

  it('reads the id from populated and raw shapes', () => {
    expect(participantUserId(populated)).toBe('u1');
    expect(participantUserId(raw)).toBe('u2');
  });
  it('falls back to a generic display name when unpopulated', () => {
    expect(participantDisplayName(populated)).toBe('Thorin');
    expect(participantDisplayName(raw)).toBe('Adventurer');
  });
});
```

- [ ] **Step 2: Run — verify both fail** (modules don't exist): `pnpm test src/features/scheduled-quests`

- [ ] **Step 3: Implement.** `src/features/scheduled-quests/types.ts`:

```ts
/**
 * Scheduled quest ("Event") types and pure helpers.
 * Server contract: unquest-server feat/scheduled-quests-v2.
 */

export type ScheduledQuestStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'failed';
export type ScheduledParticipantStatus = 'active' | 'failed' | 'completed' | 'no_show';

export interface ScheduledParticipantUser {
  id: string;
  character?: { name: string; type: string; level: number };
}

export interface ScheduledParticipant {
  /** Populated by /scheduled/:id, /scheduled/mine and /discover; raw id elsewhere. */
  userId: ScheduledParticipantUser | string;
  ready: boolean;
  phoneLocked: boolean;
  phoneLockedAt?: string;
  status: ScheduledParticipantStatus;
  rewards?: { baseXP: number; adjustedXP: number; multiplier: number; perksApplied: string[] };
}

export interface ScheduledQuestRun {
  id: string;
  status: ScheduledQuestStatus;
  scheduledStartAt: string;
  completionPolicy: 'individual';
  visibility: 'public' | 'friends';
  maxParticipants: number;
  expiresAt?: string;
  actualStartTime?: string;
  scheduledEndTime?: string;
  completedAt?: string;
  cancellationReason?: string;
  quest: { title: string; category: string; durationMinutes: number; mode: string; reward: { xp: number } };
  participants: ScheduledParticipant[];
}

/** Mirrors JOIN_WINDOW_FRACTION in the server's scheduled-quest-scoring.js. */
export const JOIN_WINDOW_FRACTION = 0.25;

export const joinCutoffMs = (run: Pick<ScheduledQuestRun, 'scheduledStartAt' | 'quest'>) =>
  new Date(run.scheduledStartAt).getTime() + run.quest.durationMinutes * 60_000 * JOIN_WINDOW_FRACTION;

export const isJoinable = (run: ScheduledQuestRun, nowMs = Date.now()) =>
  run.status === 'pending' || (run.status === 'active' && nowMs <= joinCutoffMs(run));

/** Half-open [start, end) window intersection, per spec §9. */
export const overlapsWindow = (
  a: Pick<ScheduledQuestRun, 'scheduledStartAt' | 'quest'>,
  b: Pick<ScheduledQuestRun, 'scheduledStartAt' | 'quest'>
) => {
  const aStart = new Date(a.scheduledStartAt).getTime();
  const aEnd = aStart + a.quest.durationMinutes * 60_000;
  const bStart = new Date(b.scheduledStartAt).getTime();
  const bEnd = bStart + b.quest.durationMinutes * 60_000;
  return aStart < bEnd && bStart < aEnd;
};
```

`src/features/scheduled-quests/lib/participants.ts`:

```ts
import { type ScheduledParticipant } from '../types';

export const participantUserId = (p: ScheduledParticipant | undefined): string | undefined => {
  if (!p) return undefined;
  return typeof p.userId === 'string' ? p.userId : p.userId?.id;
};

export const participantDisplayName = (p: ScheduledParticipant): string => {
  if (typeof p.userId !== 'string' && p.userId?.character?.name) return p.userId.character.name;
  return 'Adventurer';
};
```

- [ ] **Step 4: Add the WebSocket payload types.** In `src/lib/services/websocket-events.types.ts`, before `TypedWebSocketEvents`, add:

```ts
// Scheduled quest ("Event") room payloads - server: scheduled-quest.controller.js / scheduled-quest.service.js
export interface ScheduledParticipantJoinedPayload {
  questRunId: string;
  userId: string;
  participantCount: number;
}

export interface ScheduledParticipantLeftPayload {
  questRunId: string;
  userId: string;
  participantCount: number;
  kicked?: boolean;
}

export interface ScheduledParticipantFailedPayload {
  questRunId: string;
  userId: string;
  reason: string;
}

export interface QuestSettledParticipant {
  userId: string;
  status: 'completed' | 'failed' | 'no_show';
  xpAwarded: number;
  creditFailed?: boolean;
}

export interface QuestSettledPayload {
  questRunId: string;
  completedAt: string;
  participants: QuestSettledParticipant[];
}

export interface QuestCancelledPayload {
  questRunId: string;
  reason: 'empty' | 'creator_cancelled';
}
```

and inside `TypedWebSocketEvents` (new section after the participant events):

```ts
  // Scheduled quest (Event) room events
  'quest:participant-joined': (data: ScheduledParticipantJoinedPayload) => void;
  'quest:participant-left': (data: ScheduledParticipantLeftPayload) => void;
  'quest:participant-failed': (data: ScheduledParticipantFailedPayload) => void;
  'quest:settled': (data: QuestSettledPayload) => void;
  'quest:cancelled': (data: QuestCancelledPayload) => void;
```

- [ ] **Step 5: Run — verify pass:** `pnpm test src/features/scheduled-quests` and `pnpm type-check` (no *new* errors vs the Task 7 baseline).

- [ ] **Step 6: Commit.**
```bash
git add src/features/scheduled-quests src/lib/services/websocket-events.types.ts
git commit -m "feat(scheduled): event types, join-window helpers, socket payload types"
```

### Task 9: API service

**Files:**
- Create: `src/lib/services/scheduled-quest-service.ts`, `src/lib/services/scheduled-quest-service.test.ts`

- [ ] **Step 1: Failing tests** (mirror `quest-run-service.test.ts`'s mocking):

```ts
import {
  cancelScheduledQuest,
  createScheduledQuest,
  discoverScheduledQuests,
  getMyScheduledQuests,
  getScheduledQuest,
  joinScheduledQuest,
  kickParticipant,
  leaveScheduledQuest,
  scheduledQuestErrorMessage,
} from './scheduled-quest-service';

jest.mock('@/api', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));
jest.mock('@/api/common/provisional-client', () => ({
  provisionalApiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));
jest.mock('@/lib/storage', () => ({ getItem: jest.fn(() => null) }));

const { apiClient } = jest.requireMock('@/api');
const { provisionalApiClient } = jest.requireMock('@/api/common/provisional-client');
const { getItem } = jest.requireMock('@/lib/storage');

describe('scheduled-quest-service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates via POST /quest-runs/scheduled', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 'r1' } });
    const input = {
      title: '5am run club',
      category: 'fitness',
      durationMinutes: 60,
      scheduledStartAt: '2030-01-01T05:00:00.000Z',
      visibility: 'public' as const,
      maxParticipants: 10,
    };
    await expect(createScheduledQuest(input)).resolves.toEqual({ id: 'r1' });
    expect(apiClient.post).toHaveBeenCalledWith('/quest-runs/scheduled', input);
  });

  it('uses the provisional client when a provisional token exists', async () => {
    getItem.mockReturnValue('prov-token');
    provisionalApiClient.get.mockResolvedValue({ data: { results: [] } });
    await getMyScheduledQuests();
    expect(provisionalApiClient.get).toHaveBeenCalledWith('/quest-runs/scheduled/mine');
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('hits the expected endpoints', async () => {
    apiClient.get.mockResolvedValue({ data: { results: [] } });
    apiClient.post.mockResolvedValue({ data: {} });
    apiClient.delete.mockResolvedValue({ data: {} });
    await discoverScheduledQuests({ category: 'fitness' });
    expect(apiClient.get).toHaveBeenCalledWith('/quest-runs/discover', { params: { category: 'fitness' } });
    apiClient.get.mockResolvedValue({ data: { id: 'r1' } });
    await getScheduledQuest('r1');
    expect(apiClient.get).toHaveBeenCalledWith('/quest-runs/scheduled/r1');
    await joinScheduledQuest('r1');
    expect(apiClient.post).toHaveBeenCalledWith('/quest-runs/r1/join');
    await leaveScheduledQuest('r1');
    expect(apiClient.delete).toHaveBeenCalledWith('/quest-runs/r1/join');
    await cancelScheduledQuest('r1');
    expect(apiClient.delete).toHaveBeenCalledWith('/quest-runs/r1');
    await kickParticipant('r1', 'u2');
    expect(apiClient.delete).toHaveBeenCalledWith('/quest-runs/r1/participants/u2');
  });

  it('maps server error messages for display', () => {
    const err = { response: { status: 409, data: { message: 'You are already registered for an overlapping event' } } };
    expect(scheduledQuestErrorMessage(err)).toBe('You are already registered for an overlapping event');
    expect(scheduledQuestErrorMessage(new Error('boom'))).toBe('Something went wrong - try again');
  });
});
```

- [ ] **Step 2: Run — verify fail:** `pnpm test scheduled-quest-service`

- [ ] **Step 3: Implement** `src/lib/services/scheduled-quest-service.ts`:

```ts
import { apiClient } from '@/api';
import { provisionalApiClient } from '@/api/common/provisional-client';
import { getItem } from '@/lib/storage';

import { type ScheduledQuestRun } from '@/features/scheduled-quests/types';

export interface CreateScheduledQuestInput {
  title: string;
  category: string;
  durationMinutes: number;
  scheduledStartAt: string; // ISO, UTC
  visibility: 'public' | 'friends';
  maxParticipants: number;
}

export interface DiscoverParams {
  category?: string;
  page?: number;
  limit?: number;
}

// Same client-selection idiom as quest-run-service.ts: presence of a
// provisional token decides which axios instance carries the call.
const clientFor = () => (getItem<string>('provisionalAccessToken') ? provisionalApiClient : apiClient);

export async function createScheduledQuest(input: CreateScheduledQuestInput): Promise<ScheduledQuestRun> {
  const { data } = await clientFor().post('/quest-runs/scheduled', input);
  return data;
}

export async function discoverScheduledQuests(params?: DiscoverParams): Promise<{ results: ScheduledQuestRun[] }> {
  const { data } = await clientFor().get('/quest-runs/discover', { params });
  return data;
}

export async function getMyScheduledQuests(): Promise<{ results: ScheduledQuestRun[] }> {
  const { data } = await clientFor().get('/quest-runs/scheduled/mine');
  return data;
}

export async function getScheduledQuest(questRunId: string): Promise<ScheduledQuestRun> {
  const { data } = await clientFor().get(`/quest-runs/scheduled/${questRunId}`);
  return data;
}

export async function joinScheduledQuest(questRunId: string): Promise<ScheduledQuestRun> {
  const { data } = await clientFor().post(`/quest-runs/${questRunId}/join`);
  return data;
}

export async function leaveScheduledQuest(questRunId: string): Promise<void> {
  await clientFor().delete(`/quest-runs/${questRunId}/join`);
}

export async function cancelScheduledQuest(questRunId: string): Promise<void> {
  await clientFor().delete(`/quest-runs/${questRunId}`);
}

export async function kickParticipant(questRunId: string, userId: string): Promise<void> {
  await clientFor().delete(`/quest-runs/${questRunId}/participants/${userId}`);
}

/** Server messages are user-presentable (400/403/409 map in the controller). */
export function scheduledQuestErrorMessage(error: unknown): string {
  const axiosErr = error as { response?: { data?: { message?: string } } };
  return axiosErr?.response?.data?.message ?? 'Something went wrong - try again';
}
```

- [ ] **Step 4: Run — verify pass**, then commit:
```bash
git add src/lib/services/scheduled-quest-service.ts src/lib/services/scheduled-quest-service.test.ts
git commit -m "feat(scheduled): provisional-aware API service"
```

### Task 10: Store

**Files:**
- Create: `src/store/scheduled-quests-store.ts`, `src/store/scheduled-quests-store.test.ts`

- [ ] **Step 1: Failing tests:**

```ts
import { act, renderHook } from '@testing-library/react-native';

import { useScheduledQuestsStore } from './scheduled-quests-store';

const run = (id: string, startISO = '2030-01-01T05:00:00.000Z') =>
  ({
    id,
    status: 'pending',
    scheduledStartAt: startISO,
    quest: { title: 't', category: 'fitness', durationMinutes: 60, mode: 'cooperative', reward: { xp: 180 } },
    participants: [],
    completionPolicy: 'individual',
    visibility: 'public',
    maxParticipants: 10,
  }) as any;

describe('scheduled-quests-store', () => {
  beforeEach(() => act(() => useScheduledQuestsStore.getState().reset()));

  it('replaces registrations wholesale on fetch', () => {
    const { result } = renderHook(() => useScheduledQuestsStore());
    act(() => result.current.setMyRegistrations([run('a'), run('b')]));
    expect(result.current.myRegistrations.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('upserts a registration without duplicating', () => {
    const { result } = renderHook(() => useScheduledQuestsStore());
    act(() => result.current.setMyRegistrations([run('a')]));
    act(() => result.current.upsertRegistration({ ...run('a'), status: 'active' }));
    act(() => result.current.upsertRegistration(run('b')));
    expect(result.current.myRegistrations).toHaveLength(2);
    expect(result.current.myRegistrations.find((r) => r.id === 'a')?.status).toBe('active');
  });

  it('removes a registration', () => {
    const { result } = renderHook(() => useScheduledQuestsStore());
    act(() => result.current.setMyRegistrations([run('a'), run('b')]));
    act(() => result.current.removeRegistration('a'));
    expect(result.current.myRegistrations.map((r) => r.id)).toEqual(['b']);
  });

  it('records settlements by questRunId and drops the registration', () => {
    const { result } = renderHook(() => useScheduledQuestsStore());
    act(() => result.current.setMyRegistrations([run('a')]));
    const settlement = { questRunId: 'a', completedAt: '2030-01-01T06:00:00.000Z', participants: [] };
    act(() => result.current.recordSettlement(settlement as any));
    expect(result.current.settlements.a).toEqual(settlement);
    expect(result.current.myRegistrations).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run — verify fail:** `pnpm test scheduled-quests-store`

- [ ] **Step 3: Implement** `src/store/scheduled-quests-store.ts` (guild-store pattern):

```ts
/**
 * Scheduled Quests (Events) Store
 *
 * Holds the user's event registrations and settlement summaries. Discovery
 * and event-detail server data is managed by TanStack Query hooks
 * (src/api/scheduled-quests) - this store only keeps what must survive
 * screen unmounts: "my events" (for the list + overlap annotation) and
 * quest:settled payloads (for the results screen). Never touches
 * quest-store: the active-quest singleton is only involved at T-0 via the
 * standard cooperative handoff.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { type ScheduledQuestRun } from '@/features/scheduled-quests/types';
import { type QuestSettledPayload } from '@/lib/services/websocket-events.types';
import { getItem, removeItem, setItem } from '@/lib/storage';

interface ScheduledQuestsState {
  myRegistrations: ScheduledQuestRun[];
  settlements: Record<string, QuestSettledPayload>;
}

interface ScheduledQuestsActions {
  setMyRegistrations: (runs: ScheduledQuestRun[]) => void;
  upsertRegistration: (run: ScheduledQuestRun) => void;
  removeRegistration: (questRunId: string) => void;
  recordSettlement: (settlement: QuestSettledPayload) => void;
  reset: () => void;
}

type ScheduledQuestsStore = ScheduledQuestsState & ScheduledQuestsActions;

const initialState: ScheduledQuestsState = {
  myRegistrations: [],
  settlements: {},
};

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

export const useScheduledQuestsStore = create<ScheduledQuestsStore>()(
  persist(
    (set) => ({
      ...initialState,

      setMyRegistrations: (runs) => set({ myRegistrations: runs }),

      upsertRegistration: (run) =>
        set((state) => ({
          myRegistrations: state.myRegistrations.some((r) => r.id === run.id)
            ? state.myRegistrations.map((r) => (r.id === run.id ? run : r))
            : [...state.myRegistrations, run],
        })),

      removeRegistration: (questRunId) =>
        set((state) => ({
          myRegistrations: state.myRegistrations.filter((r) => r.id !== questRunId),
        })),

      recordSettlement: (settlement) =>
        set((state) => ({
          settlements: { ...state.settlements, [settlement.questRunId]: settlement },
          myRegistrations: state.myRegistrations.filter((r) => r.id !== settlement.questRunId),
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'scheduled-quests-storage',
      storage: createJSONStorage(() => ({
        getItem: getItemForStorage,
        setItem: setItemForStorage,
        removeItem: removeItemForStorage,
      })),
      partialize: (state) => ({
        myRegistrations: state.myRegistrations,
        settlements: state.settlements,
      }),
    }
  )
);
```

- [ ] **Step 4: Run — verify pass**, commit:
```bash
git add src/store/scheduled-quests-store.ts src/store/scheduled-quests-store.test.ts
git commit -m "feat(scheduled): registrations + settlements store"
```

### Task 11: Query hooks and mutations

**Files:**
- Create: `src/api/scheduled-quests/index.ts`, `use-discover-scheduled-quests.ts`, `use-my-scheduled-quests.ts`, `use-scheduled-quest.ts`, `use-scheduled-quest-mutations.ts`, plus `use-my-scheduled-quests.test.tsx` and `use-scheduled-quest-mutations.test.tsx`

- [ ] **Step 1: Failing tests.** `src/api/scheduled-quests/use-my-scheduled-quests.test.tsx` (wrapper pattern from `src/api/quest-runs/use-quest-reward-preview.test.tsx`):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { useScheduledQuestsStore } from '@/store/scheduled-quests-store';

import { useMyScheduledQuests } from './use-my-scheduled-quests';

jest.mock('@/lib/services/scheduled-quest-service', () => ({
  getMyScheduledQuests: jest.fn().mockResolvedValue({
    results: [
      {
        id: 'r1',
        status: 'pending',
        scheduledStartAt: '2030-01-01T05:00:00.000Z',
        quest: { title: 't', category: 'fitness', durationMinutes: 60, mode: 'cooperative', reward: { xp: 180 } },
        participants: [],
        completionPolicy: 'individual',
        visibility: 'public',
        maxParticipants: 10,
      },
    ],
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMyScheduledQuests', () => {
  it('fetches and syncs registrations into the store', async () => {
    useScheduledQuestsStore.getState().reset();
    const { result } = renderHook(() => useMyScheduledQuests(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(useScheduledQuestsStore.getState().myRegistrations.map((r) => r.id)).toEqual(['r1']);
  });
});
```

`src/api/scheduled-quests/use-scheduled-quest-mutations.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { useJoinScheduledQuest } from './use-scheduled-quest-mutations';

jest.mock('@/lib/services/scheduled-quest-service', () => ({
  joinScheduledQuest: jest.fn().mockResolvedValue({ id: 'r1', status: 'pending' }),
}));

describe('useJoinScheduledQuest', () => {
  it('joins then invalidates scheduled-quests queries', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useJoinScheduledQuest(), { wrapper });
    act(() => result.current.mutate('r1'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['scheduled-quests'] });
  });
});
```

- [ ] **Step 2: Run — verify fail:** `pnpm test src/api/scheduled-quests`

- [ ] **Step 3: Implement.** `src/api/scheduled-quests/use-discover-scheduled-quests.ts`:

```ts
import { useQuery } from '@tanstack/react-query';

import { discoverScheduledQuests, type DiscoverParams } from '@/lib/services/scheduled-quest-service';

export const useDiscoverScheduledQuests = (params?: DiscoverParams) =>
  useQuery({
    queryKey: ['scheduled-quests', 'discover', params ?? {}],
    queryFn: async () => (await discoverScheduledQuests(params)).results,
    refetchInterval: 30_000,
  });
```

`src/api/scheduled-quests/use-my-scheduled-quests.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getMyScheduledQuests } from '@/lib/services/scheduled-quest-service';
import { useScheduledQuestsStore } from '@/store/scheduled-quests-store';

export const useMyScheduledQuests = () => {
  const setMyRegistrations = useScheduledQuestsStore((s) => s.setMyRegistrations);
  const query = useQuery({
    queryKey: ['scheduled-quests', 'mine'],
    queryFn: async () => (await getMyScheduledQuests()).results,
    refetchOnMount: 'always', // spec §4: never trust stale registrations
  });
  useEffect(() => {
    if (query.data) setMyRegistrations(query.data);
  }, [query.data, setMyRegistrations]);
  return query;
};
```

`src/api/scheduled-quests/use-scheduled-quest.ts`:

```ts
import { useQuery } from '@tanstack/react-query';

import { getScheduledQuest } from '@/lib/services/scheduled-quest-service';

export const useScheduledQuest = (questRunId: string | undefined) =>
  useQuery({
    queryKey: ['scheduled-quests', 'detail', questRunId],
    queryFn: () => getScheduledQuest(questRunId as string),
    enabled: !!questRunId,
    // Polling backstop for missed socket events (backgrounded app, room-join
    // races). The room hook invalidates for instant updates.
    refetchInterval: 15_000,
  });
```

`src/api/scheduled-quests/use-scheduled-quest-mutations.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  cancelScheduledQuest,
  createScheduledQuest,
  type CreateScheduledQuestInput,
  joinScheduledQuest,
  kickParticipant,
  leaveScheduledQuest,
} from '@/lib/services/scheduled-quest-service';
import { useScheduledQuestsStore } from '@/store/scheduled-quests-store';

const useInvalidateScheduledQuests = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['scheduled-quests'] });
};

export const useCreateScheduledQuest = () => {
  const invalidate = useInvalidateScheduledQuests();
  const upsertRegistration = useScheduledQuestsStore((s) => s.upsertRegistration);
  return useMutation({
    mutationFn: (input: CreateScheduledQuestInput) => createScheduledQuest(input),
    onSuccess: (run) => {
      upsertRegistration(run);
      invalidate();
    },
  });
};

export const useJoinScheduledQuest = () => {
  const invalidate = useInvalidateScheduledQuests();
  const upsertRegistration = useScheduledQuestsStore((s) => s.upsertRegistration);
  return useMutation({
    mutationFn: (questRunId: string) => joinScheduledQuest(questRunId),
    onSuccess: (run) => {
      upsertRegistration(run);
      invalidate();
    },
  });
};

export const useLeaveScheduledQuest = () => {
  const invalidate = useInvalidateScheduledQuests();
  const removeRegistration = useScheduledQuestsStore((s) => s.removeRegistration);
  return useMutation({
    mutationFn: (questRunId: string) => leaveScheduledQuest(questRunId),
    onSuccess: (_void, questRunId) => {
      removeRegistration(questRunId);
      invalidate();
    },
  });
};

export const useCancelScheduledQuest = () => {
  const invalidate = useInvalidateScheduledQuests();
  const removeRegistration = useScheduledQuestsStore((s) => s.removeRegistration);
  return useMutation({
    mutationFn: (questRunId: string) => cancelScheduledQuest(questRunId),
    onSuccess: (_void, questRunId) => {
      removeRegistration(questRunId);
      invalidate();
    },
  });
};

export const useKickParticipant = () => {
  const invalidate = useInvalidateScheduledQuests();
  return useMutation({
    mutationFn: ({ questRunId, userId }: { questRunId: string; userId: string }) =>
      kickParticipant(questRunId, userId),
    onSuccess: () => invalidate(),
  });
};
```

`src/api/scheduled-quests/index.ts` re-exports all hooks.

- [ ] **Step 4: Run — verify pass**, commit:
```bash
git add src/api/scheduled-quests
git commit -m "feat(scheduled): TanStack Query hooks and mutations"
```

### Task 12: Scoped WebSocket room hook

**Files:**
- Create: `src/features/scheduled-quests/hooks/use-scheduled-quest-room.ts`, `use-scheduled-quest-room.test.tsx`

Server facts this encodes: the room is joined by emitting `joinQuestRoom {questRunId}` and **only participants pass the server's room gate** — for non-participants the hook is harmless (server replies `quest:error`) and the 15 s poll covers them. `questStarted` also arrives on the per-user room, so participants get it even if the room join raced.

- [ ] **Step 1: Failing tests** (mock `useWebSocket` exactly like `cooperative-pending-quest.test.tsx` lines 14-23):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import React from 'react';

import { useWebSocket } from '@/components/providers/websocket-provider';
import { useScheduledQuestsStore } from '@/store/scheduled-quests-store';

import { useScheduledQuestRoom } from './use-scheduled-quest-room';

jest.mock('@/components/providers/websocket-provider', () => ({
  useWebSocket: jest.fn(),
}));

describe('useScheduledQuestRoom', () => {
  const listeners: Record<string, (p: any) => void> = {};
  const mockWebSocket = {
    isConnected: true,
    joinQuestRoom: jest.fn(),
    leaveQuestRoom: jest.fn(),
    addListener: jest.fn((event: string, handler: (p: any) => void) => {
      listeners[event] = handler;
    }),
    removeListener: jest.fn(),
  };
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    (useWebSocket as jest.Mock).mockReturnValue(mockWebSocket);
    useScheduledQuestsStore.getState().reset();
  });

  it('joins the room and registers the event listeners', () => {
    renderHook(() => useScheduledQuestRoom('r1'), { wrapper });
    expect(mockWebSocket.joinQuestRoom).toHaveBeenCalledWith('r1');
    for (const event of [
      'quest:participant-joined',
      'quest:participant-left',
      'quest:participant-failed',
      'questStarted',
      'quest:settled',
      'quest:cancelled',
    ]) {
      expect(mockWebSocket.addListener).toHaveBeenCalledWith(event, expect.any(Function));
    }
  });

  it('invalidates the detail query on roster events for this run only', () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useScheduledQuestRoom('r1'), { wrapper });
    listeners['quest:participant-joined']({ questRunId: 'other', userId: 'u2', participantCount: 3 });
    expect(invalidateSpy).not.toHaveBeenCalled();
    listeners['quest:participant-joined']({ questRunId: 'r1', userId: 'u2', participantCount: 3 });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['scheduled-quests', 'detail', 'r1'] });
  });

  it('records settlements and fires onCancelled', () => {
    const onCancelled = jest.fn();
    renderHook(() => useScheduledQuestRoom('r1', { onCancelled }), { wrapper });
    const settlement = { questRunId: 'r1', completedAt: 'x', participants: [] };
    listeners['quest:settled'](settlement);
    expect(useScheduledQuestsStore.getState().settlements.r1).toEqual(settlement);
    listeners['quest:cancelled']({ questRunId: 'r1', reason: 'creator_cancelled' });
    expect(onCancelled).toHaveBeenCalledWith({ questRunId: 'r1', reason: 'creator_cancelled' });
  });

  it('cleans up listeners and leaves the room on unmount', () => {
    const { unmount } = renderHook(() => useScheduledQuestRoom('r1'), { wrapper });
    unmount();
    expect(mockWebSocket.leaveQuestRoom).toHaveBeenCalledWith('r1');
    expect(mockWebSocket.removeListener).toHaveBeenCalledTimes(6);
  });
});
```

- [ ] **Step 2: Run — verify fail:** `pnpm test use-scheduled-quest-room`

- [ ] **Step 3: Implement:**

```ts
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useWebSocket } from '@/components/providers/websocket-provider';
import {
  type QuestCancelledPayload,
  type QuestSettledPayload,
} from '@/lib/services/websocket-events.types';
import { useScheduledQuestsStore } from '@/store/scheduled-quests-store';

interface Options {
  onCancelled?: (payload: QuestCancelledPayload) => void;
}

/**
 * Scoped questRun-room subscription for the event screen. Joins the socket
 * room while mounted and turns room events into query invalidations (the
 * joined/left payloads carry no display data, so refetch beats upsert).
 * Non-participants fail the server's room gate silently - the detail
 * query's 15s poll covers them. The provider's context value is not
 * memoized, so provider re-renders re-run this effect (leave/rejoin +
 * re-listen); that matches the existing coop screens' pattern and the poll
 * backstops any gap.
 */
export function useScheduledQuestRoom(questRunId: string | undefined, options?: Options) {
  const { isConnected, joinQuestRoom, leaveQuestRoom, addListener, removeListener } = useWebSocket();
  const queryClient = useQueryClient();
  const recordSettlement = useScheduledQuestsStore((s) => s.recordSettlement);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!questRunId || !isConnected) return;

    joinQuestRoom(questRunId);
    const forThisRun =
      (handler: (payload: any) => void) =>
      (payload: { questRunId?: string }) => {
        if (payload?.questRunId === questRunId) handler(payload);
      };
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ['scheduled-quests', 'detail', questRunId] });

    const handlers: [string, (payload: any) => void][] = [
      ['quest:participant-joined', forThisRun(invalidate)],
      ['quest:participant-left', forThisRun(invalidate)],
      ['quest:participant-failed', forThisRun(invalidate)],
      ['questStarted', forThisRun(invalidate)],
      [
        'quest:settled',
        forThisRun((payload: QuestSettledPayload) => {
          recordSettlement(payload);
          invalidate();
        }),
      ],
      [
        'quest:cancelled',
        forThisRun((payload: QuestCancelledPayload) => {
          invalidate();
          optionsRef.current?.onCancelled?.(payload);
        }),
      ],
    ];
    handlers.forEach(([event, handler]) => addListener(event, handler));

    return () => {
      handlers.forEach(([event, handler]) => removeListener(event, handler));
      leaveQuestRoom(questRunId);
    };
  }, [questRunId, isConnected, joinQuestRoom, leaveQuestRoom, addListener, removeListener, queryClient, recordSettlement]);
}
```

- [ ] **Step 4: Run — verify pass**, commit:
```bash
git add src/features/scheduled-quests/hooks
git commit -m "feat(scheduled): scoped questRun-room websocket hook"
```

### Task 13: `EventCard` and `RosterRow` components

**Files:**
- Create: `src/features/scheduled-quests/components/event-card.tsx` + test, `src/features/scheduled-quests/components/roster-row.tsx` + test

Visual base: the "Coming Soon" mock card in `join-cooperative-quest.tsx:342-422` (title / host / duration / `12/20` participants / starts-in). Use `Card`, `Text`, `View`, `TouchableOpacity` from `@/components/ui` and icons from `lucide-react-native`, same as that file.

- [ ] **Step 1: Failing tests.** `event-card.test.tsx`:

```tsx
import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { EventCard } from './event-card';

const run = {
  id: 'r1',
  status: 'pending',
  scheduledStartAt: new Date(Date.now() + 60 * 60_000).toISOString(),
  quest: { title: '5am run club', category: 'fitness', durationMinutes: 60, mode: 'cooperative', reward: { xp: 180 } },
  participants: [
    { userId: { id: 'u1', character: { name: 'Thorin', type: 'knight', level: 4 } }, ready: false, phoneLocked: false, status: 'active' },
  ],
  completionPolicy: 'individual',
  visibility: 'public',
  maxParticipants: 10,
} as any;

describe('EventCard', () => {
  it('renders title, host, duration, capacity and a starts-in label', () => {
    render(<EventCard run={run} onPress={jest.fn()} />);
    expect(screen.getByText('5am run club')).toBeTruthy();
    expect(screen.getByText(/Thorin/)).toBeTruthy();
    expect(screen.getByText(/60 min/)).toBeTruthy();
    expect(screen.getByText('1/10')).toBeTruthy();
    expect(screen.getByText(/Starts/)).toBeTruthy();
  });

  it('shows a joinable-now label for active runs inside the window', () => {
    const active = { ...run, status: 'active', scheduledStartAt: new Date(Date.now() - 5 * 60_000).toISOString() };
    render(<EventCard run={active} onPress={jest.fn()} />);
    expect(screen.getByText(/Happening now/)).toBeTruthy();
  });

  it('shows the overlap annotation when flagged', () => {
    render(<EventCard run={run} onPress={jest.fn()} overlapsRegistration />);
    expect(screen.getByText(/Overlaps one of your events/)).toBeTruthy();
  });
});
```

`roster-row.test.tsx`:

```tsx
import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { RosterRow } from './roster-row';

describe('RosterRow', () => {
  const participant = {
    userId: { id: 'u1', character: { name: 'Thorin', type: 'knight', level: 4 } },
    ready: false,
    phoneLocked: false,
    status: 'active',
  } as any;

  it('renders name, level and a status badge', () => {
    render(<RosterRow participant={participant} isCreator={false} runStatus="pending" />);
    expect(screen.getByText('Thorin')).toBeTruthy();
    expect(screen.getByText(/Lv\. 4/)).toBeTruthy();
    expect(screen.getByText('Registered')).toBeTruthy();
  });

  it('maps in-run and settled statuses', () => {
    render(<RosterRow participant={{ ...participant, phoneLocked: true }} isCreator={false} runStatus="active" />);
    expect(screen.getByText('Locked in')).toBeTruthy();
    render(<RosterRow participant={{ ...participant, status: 'no_show' }} isCreator={false} runStatus="completed" />);
    expect(screen.getByText('No-show')).toBeTruthy();
  });

  it('marks the creator and renders a kick action when allowed', () => {
    const onKick = jest.fn();
    render(<RosterRow participant={participant} isCreator runStatus="pending" onKick={onKick} />);
    expect(screen.getByText(/Host/)).toBeTruthy();
    expect(screen.getByTestId('kick-button')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — verify fail**, then implement. `roster-row.tsx`:

```tsx
import { UserX } from 'lucide-react-native';
import React from 'react';

import { Text, TouchableOpacity, View } from '@/components/ui';

import { participantDisplayName } from '../lib/participants';
import { type ScheduledParticipant, type ScheduledQuestStatus } from '../types';

interface Props {
  participant: ScheduledParticipant;
  isCreator: boolean;
  runStatus: ScheduledQuestStatus;
  onKick?: () => void;
}

const statusLabel = (p: ScheduledParticipant, runStatus: ScheduledQuestStatus): string => {
  if (p.status === 'failed') return 'Failed';
  if (p.status === 'no_show') return 'No-show';
  if (p.status === 'completed') return 'Completed';
  if (runStatus === 'active') return p.phoneLocked ? 'Locked in' : 'Not locked in';
  return 'Registered';
};

export function RosterRow({ participant, isCreator, runStatus, onKick }: Props) {
  const character = typeof participant.userId === 'string' ? undefined : participant.userId?.character;
  return (
    <View className="mb-2 flex-row items-center justify-between rounded-lg bg-neutral-800/40 px-3 py-2">
      <View className="flex-1">
        <Text className="text-base font-semibold">
          {participantDisplayName(participant)}
          {isCreator ? '  ·  Host' : ''}
        </Text>
        {character ? <Text className="text-sm text-neutral-400">{`Lv. ${character.level} ${character.type}`}</Text> : null}
      </View>
      <Text className="mr-2 text-sm text-neutral-300">{statusLabel(participant, runStatus)}</Text>
      {onKick ? (
        <TouchableOpacity testID="kick-button" onPress={onKick} className="p-1">
          <UserX size={18} color="#f87171" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
```

`event-card.tsx`:

```tsx
import { Clock, User, Users } from 'lucide-react-native';
import React from 'react';

import { Card, Text, TouchableOpacity, View } from '@/components/ui';

import { participantDisplayName } from '../lib/participants';
import { type ScheduledQuestRun } from '../types';

interface Props {
  run: ScheduledQuestRun;
  onPress: () => void;
  overlapsRegistration?: boolean;
}

const startsLabel = (run: ScheduledQuestRun): string => {
  if (run.status === 'active') return 'Happening now - join in!';
  const minutes = Math.max(0, Math.round((new Date(run.scheduledStartAt).getTime() - Date.now()) / 60_000));
  if (minutes < 60) return `Starts in ${minutes} min`;
  if (minutes < 48 * 60) return `Starts in ${Math.round(minutes / 60)} h`;
  return `Starts ${new Date(run.scheduledStartAt).toLocaleDateString()}`;
};

export function EventCard({ run, onPress, overlapsRegistration }: Props) {
  const host = run.participants[0];
  return (
    <TouchableOpacity onPress={onPress} testID={`event-card-${run.id}`}>
      <Card className="mb-3 p-4">
        <Text className="text-base font-semibold">{run.quest.title}</Text>
        {host ? (
          <View className="mt-1 flex-row items-center">
            <User size={14} color="#9ca3af" />
            <Text className="ml-1 text-sm text-neutral-400">Hosted by {participantDisplayName(host)}</Text>
          </View>
        ) : null}
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Clock size={14} color="#9ca3af" />
            <Text className="ml-1 text-sm text-neutral-400">{run.quest.durationMinutes} min</Text>
          </View>
          <View className="flex-row items-center">
            <Users size={14} color="#9ca3af" />
            <Text className="ml-1 text-sm text-neutral-400">
              {run.participants.length}/{run.maxParticipants}
            </Text>
          </View>
          <Text className="text-sm font-semibold text-primary-400">{startsLabel(run)}</Text>
        </View>
        {overlapsRegistration ? (
          <Text className="mt-2 text-xs text-amber-400">Overlaps one of your events</Text>
        ) : null}
      </Card>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 3: Run — verify pass** (`pnpm test src/features/scheduled-quests/components`), commit:
```bash
git add src/features/scheduled-quests/components
git commit -m "feat(scheduled): EventCard and RosterRow components"
```

### Task 14: Discovery screen (`/scheduled-quest`)

**Files:**
- Create: `src/app/scheduled-quest/index.tsx`, `src/app/scheduled-quest/index.test.tsx`
- Modify: `src/app/_layout.tsx` (Stack.Screen registrations)

- [ ] **Step 1: Failing tests** (screen-test pattern of `cooperative-pending-quest.test.tsx`: mock `expo-router`, mock the hooks):

```tsx
import React from 'react';

import { render, screen, fireEvent } from '@/lib/test-utils';

import ScheduledQuestDiscovery from './index';

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/api/scheduled-quests', () => ({
  useDiscoverScheduledQuests: jest.fn(),
  useMyScheduledQuests: jest.fn(),
}));

const { useDiscoverScheduledQuests, useMyScheduledQuests } = jest.requireMock('@/api/scheduled-quests');

const run = (id: string, title: string) => ({
  id,
  status: 'pending',
  scheduledStartAt: new Date(Date.now() + 3_600_000).toISOString(),
  quest: { title, category: 'fitness', durationMinutes: 60, mode: 'cooperative', reward: { xp: 180 } },
  participants: [],
  completionPolicy: 'individual',
  visibility: 'public',
  maxParticipants: 10,
});

describe('ScheduledQuestDiscovery', () => {
  beforeEach(() => {
    useDiscoverScheduledQuests.mockReturnValue({ data: [run('r1', 'Morning run')], isLoading: false, refetch: jest.fn() });
    useMyScheduledQuests.mockReturnValue({ data: [run('r2', 'My event')], isLoading: false, refetch: jest.fn() });
  });

  it('renders the Discover tab feed', () => {
    render(<ScheduledQuestDiscovery />);
    expect(screen.getByText('Morning run')).toBeTruthy();
  });

  it('switches to My events', () => {
    render(<ScheduledQuestDiscovery />);
    fireEvent.press(screen.getByText('My events'));
    expect(screen.getByText('My event')).toBeTruthy();
  });

  it('shows an empty state when discovery is empty', () => {
    useDiscoverScheduledQuests.mockReturnValue({ data: [], isLoading: false, refetch: jest.fn() });
    render(<ScheduledQuestDiscovery />);
    expect(screen.getByText(/No upcoming events/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — verify fail**, then implement `src/app/scheduled-quest/index.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { CalendarPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { useDiscoverScheduledQuests, useMyScheduledQuests } from '@/api/scheduled-quests';
import { FocusAwareStatusBar, ScreenContainer, Text, TouchableOpacity, View } from '@/components/ui';
import { EventCard } from '@/features/scheduled-quests/components/event-card';
import { overlapsWindow, type ScheduledQuestRun } from '@/features/scheduled-quests/types';

type Tab = 'discover' | 'mine';

export default function ScheduledQuestDiscovery() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('discover');
  const discover = useDiscoverScheduledQuests();
  const mine = useMyScheduledQuests();

  const registrations = mine.data ?? [];
  const feed: ScheduledQuestRun[] = (tab === 'discover' ? discover.data : mine.data) ?? [];
  const active = tab === 'discover' ? discover : mine;

  return (
    <ScreenContainer>
      <FocusAwareStatusBar />
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-xl font-bold">Public Events</Text>
        <TouchableOpacity
          testID="create-event-button"
          onPress={() => router.push('/scheduled-quest/create')}
          className="flex-row items-center rounded-lg bg-primary-400 px-3 py-2"
        >
          <CalendarPlus size={18} color="#FFFFFF" />
          <Text className="ml-1 font-semibold text-white">New event</Text>
        </TouchableOpacity>
      </View>

      <View className="mb-2 flex-row px-4">
        {(['discover', 'mine'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            className={`mr-2 rounded-full px-4 py-2 ${tab === t ? 'bg-primary-400' : 'bg-neutral-800'}`}
          >
            <Text className={`font-semibold ${tab === t ? 'text-white' : 'text-neutral-300'}`}>
              {t === 'discover' ? 'Discover' : 'My events'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={active.isLoading} onRefresh={() => active.refetch()} />}
      >
        {feed.length === 0 ? (
          <Text className="mt-10 text-center text-neutral-400">
            {tab === 'discover'
              ? 'No upcoming events right now - create one!'
              : "You haven't registered for any events yet."}
          </Text>
        ) : (
          feed.map((run) => (
            <EventCard
              key={run.id}
              run={run}
              onPress={() => router.push(`/scheduled-quest/${run.id}`)}
              overlapsRegistration={
                tab === 'discover' && registrations.some((r) => r.id !== run.id && overlapsWindow(r, run))
              }
            />
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
```

- [ ] **Step 3: Register the routes.** In `src/app/_layout.tsx`, next to the other top-level `<Stack.Screen>` entries (lines ~404-457):

```tsx
<Stack.Screen name="scheduled-quest/index" options={{ headerShown: false }} />
<Stack.Screen name="scheduled-quest/create" options={{ headerShown: false }} />
<Stack.Screen name="scheduled-quest/[id]" options={{ headerShown: false }} />
```

- [ ] **Step 4: Run — verify pass** (`pnpm test src/app/scheduled-quest`), commit:
```bash
git add src/app/scheduled-quest src/app/_layout.tsx
git commit -m "feat(scheduled): discovery screen with Discover/My-events tabs"
```

### Task 15: Create-event screen

**Files:**
- Create: `src/features/scheduled-quests/lib/validate-event-form.ts`, `src/features/scheduled-quests/lib/validate-event-form.test.ts`
- Create: `src/app/scheduled-quest/create.tsx`, `src/app/scheduled-quest/create.test.tsx`

Reuses `CombinedQuestInput` (`src/components/QuestForm/combined-quest-input.tsx` — props `{initialDuration, onQuestNameChange, onDurationChange}`, no react-hook-form) and `CategorySlider` (`src/components/QuestForm/category-slider.tsx` — needs a react-hook-form `control` with field name `questCategory`; instantiate `useForm({ defaultValues: { questCategory: 'fitness' } })` and `watch`). Date/time via `@react-native-community/datetimepicker` (already a dependency; usage example in `src/app/(app)/reminder-setup.tsx`). Validation lives in a pure function so the lead-floor branches are unit-testable without driving the date picker.

- [ ] **Step 1: Failing validator tests** — `src/features/scheduled-quests/lib/validate-event-form.test.ts`:

```ts
import { validateEventForm } from './validate-event-form';

describe('validateEventForm', () => {
  const now = 1_000_000_000_000;

  it('requires a title', () => {
    expect(validateEventForm({ title: '  ', startsAtMs: now + 3_600_000, nowMs: now })).toMatch(/title/i);
  });
  it('rejects starts below the lead floor (5s violates the dev floor too)', () => {
    expect(validateEventForm({ title: 'Run', startsAtMs: now + 5_000, nowMs: now })).toMatch(/at least 15 minutes/i);
  });
  it('rejects starts beyond 14 days', () => {
    expect(validateEventForm({ title: 'Run', startsAtMs: now + 15 * 24 * 3_600_000, nowMs: now })).toMatch(/within 14 days/i);
  });
  it('accepts a valid form', () => {
    expect(validateEventForm({ title: 'Run', startsAtMs: now + 3_600_000, nowMs: now })).toBeNull();
  });
});
```

And the screen test — `src/app/scheduled-quest/create.test.tsx` (the invalid-submit case uses the empty default title, which is deterministic without driving the picker; the lead-floor branches are covered by the validator tests above):

```tsx
import React from 'react';

import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';

import CreateScheduledQuest from './create';

const mockMutate = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), back: jest.fn() }) }));
jest.mock('@/api/scheduled-quests', () => ({
  useCreateScheduledQuest: () => ({ mutate: mockMutate, isPending: false, error: null }),
}));

describe('CreateScheduledQuest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the form fields', () => {
    render(<CreateScheduledQuest />);
    expect(screen.getByText(/Schedule an event/i)).toBeTruthy();
    expect(screen.getByText(/Starts at/i)).toBeTruthy();
    expect(screen.getByText(/Visibility/i)).toBeTruthy();
    expect(screen.getByText(/Create event/i)).toBeTruthy();
  });

  it('blocks submit and surfaces the validation error while the form is invalid', async () => {
    render(<CreateScheduledQuest />);
    fireEvent.press(screen.getByText(/Create event/i)); // default title is empty
    await waitFor(() => expect(screen.getByText(/Give your event a title/i)).toBeTruthy());
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — verify fail** (`pnpm test validate-event-form` and `pnpm test src/app/scheduled-quest/create`), then implement.

`src/features/scheduled-quests/lib/validate-event-form.ts`:

```ts
// Mirrors the server's lead-window checks in scheduled-quest.controller.js
// (including the dev relaxation of the floor to 10s).
const MIN_LEAD_MS = __DEV__ ? 10 * 1000 : 15 * 60 * 1000;
const MAX_LEAD_MS = 14 * 24 * 60 * 60 * 1000;

export function validateEventForm(input: { title: string; startsAtMs: number; nowMs?: number }): string | null {
  const now = input.nowMs ?? Date.now();
  if (!input.title.trim()) return 'Give your event a title';
  const lead = input.startsAtMs - now;
  if (lead < MIN_LEAD_MS) return 'Events must start at least 15 minutes from now';
  if (lead > MAX_LEAD_MS) return 'Events must start within 14 days';
  return null;
}
```

`src/app/scheduled-quest/create.tsx`:

```tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Platform, ScrollView } from 'react-native';

import { useCreateScheduledQuest } from '@/api/scheduled-quests';
import { CategorySlider } from '@/components/QuestForm/category-slider';
import { CombinedQuestInput } from '@/components/QuestForm/combined-quest-input';
import { Button, FocusAwareStatusBar, ScreenContainer, Text, TouchableOpacity, View } from '@/components/ui';
import { validateEventForm } from '@/features/scheduled-quests/lib/validate-event-form';
import { scheduledQuestErrorMessage } from '@/lib/services/scheduled-quest-service';

const XP_PER_MINUTE = 3; // display only - the server sets the authoritative reward

export default function CreateScheduledQuest() {
  const router = useRouter();
  const createMutation = useCreateScheduledQuest();
  const { control, watch } = useForm({ defaultValues: { questCategory: 'fitness' } });
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [startsAt, setStartsAt] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [showPicker, setShowPicker] = useState<'date' | 'time' | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = () => {
    const error = validateEventForm({ title, startsAtMs: startsAt.getTime() });
    if (error) return setValidationError(error);
    setValidationError(null);
    createMutation.mutate(
      {
        title: title.trim(),
        category: watch('questCategory'),
        durationMinutes,
        scheduledStartAt: startsAt.toISOString(),
        visibility,
        maxParticipants,
      },
      { onSuccess: (run) => router.replace(`/scheduled-quest/${run.id}`) }
    );
  };

  return (
    <ScreenContainer>
      <FocusAwareStatusBar />
      <ScrollView className="flex-1 px-4">
        <Text className="py-3 text-xl font-bold">Schedule an event</Text>

        <CombinedQuestInput
          initialDuration={durationMinutes}
          onQuestNameChange={setTitle}
          onDurationChange={setDurationMinutes}
        />
        <CategorySlider control={control} questCategory={watch('questCategory')} />

        <Text className="mt-4 font-semibold">Starts at</Text>
        <View className="mt-1 flex-row">
          <TouchableOpacity onPress={() => setShowPicker('date')} className="mr-2 rounded-lg bg-neutral-800 px-3 py-2">
            <Text>{startsAt.toLocaleDateString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPicker('time')} className="rounded-lg bg-neutral-800 px-3 py-2">
            <Text>{startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </TouchableOpacity>
        </View>
        {showPicker ? (
          <DateTimePicker
            value={startsAt}
            mode={showPicker}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(_event, date) => {
              setShowPicker(null);
              if (date) setStartsAt(date);
            }}
          />
        ) : null}

        <Text className="mt-4 font-semibold">Visibility</Text>
        <View className="mt-1 flex-row">
          {(['public', 'friends'] as const).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setVisibility(v)}
              className={`mr-2 rounded-full px-4 py-2 ${visibility === v ? 'bg-primary-400' : 'bg-neutral-800'}`}
            >
              <Text className={visibility === v ? 'font-semibold text-white' : 'text-neutral-300'}>
                {v === 'public' ? 'Public' : 'Friends only'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="mt-4 font-semibold">Max participants: {maxParticipants}</Text>
        <View className="mt-1 flex-row">
          {[5, 10].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => setMaxParticipants(n)}
              className={`mr-2 rounded-full px-4 py-2 ${maxParticipants === n ? 'bg-primary-400' : 'bg-neutral-800'}`}
            >
              <Text className={maxParticipants === n ? 'font-semibold text-white' : 'text-neutral-300'}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="mt-4 text-sm text-neutral-400">Reward: ~{durationMinutes * XP_PER_MINUTE} XP for finishing</Text>

        {validationError ? <Text className="mt-2 text-sm text-red-400">{validationError}</Text> : null}
        {createMutation.error ? (
          <Text className="mt-2 text-sm text-red-400">{scheduledQuestErrorMessage(createMutation.error)}</Text>
        ) : null}

        <Button label="Create event" onPress={submit} loading={createMutation.isPending} className="my-6" />
      </ScrollView>
    </ScreenContainer>
  );
}
```

(If `Button` from `@/components/ui` has a different prop shape, mirror whatever `create-cooperative-quest.tsx` uses for its submit button.)

- [ ] **Step 3: Run — verify pass**, commit:
```bash
git add src/features/scheduled-quests/lib src/app/scheduled-quest/create.tsx src/app/scheduled-quest/create.test.tsx
git commit -m "feat(scheduled): create-event screen"
```

### Task 16: Event screen (`/scheduled-quest/[id]`) — lobby states

**Files:**
- Create: `src/app/scheduled-quest/[id].tsx`, `src/app/scheduled-quest/event-screen.test.tsx`

The screen derives one of six views from the fetched run + clock + settlement record (D4). This task builds the shell plus the pending-lobby and active-join states; Task 17 adds Take-part; Task 18 adds results/cancelled.

- [ ] **Step 1: Failing tests:**

```tsx
import React from 'react';

import { fireEvent, render, screen } from '@/lib/test-utils';
import { useScheduledQuestsStore } from '@/store/scheduled-quests-store';
import { useUserStore } from '@/store/user-store';

import EventScreen from './[id]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'r1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/features/scheduled-quests/hooks/use-scheduled-quest-room', () => ({
  useScheduledQuestRoom: jest.fn(),
}));
jest.mock('@/features/scheduled-quests/hooks/use-take-part', () => ({
  useTakePart: () => ({ takePart: jest.fn(), isArming: false }),
}));
jest.mock('@/api/scheduled-quests', () => ({
  useScheduledQuest: jest.fn(),
  useJoinScheduledQuest: () => ({ mutate: jest.fn(), isPending: false, error: null }),
  useLeaveScheduledQuest: () => ({ mutate: jest.fn(), isPending: false }),
  useCancelScheduledQuest: () => ({ mutate: jest.fn(), isPending: false }),
  useKickParticipant: () => ({ mutate: jest.fn(), isPending: false }),
}));

const { useScheduledQuest } = jest.requireMock('@/api/scheduled-quests');

const baseRun = (overrides = {}) => ({
  id: 'r1',
  status: 'pending',
  scheduledStartAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  quest: { title: '5am run club', category: 'fitness', durationMinutes: 60, mode: 'cooperative', reward: { xp: 180 } },
  participants: [
    { userId: { id: 'creator', character: { name: 'Thorin', type: 'knight', level: 4 } }, ready: false, phoneLocked: false, status: 'active' },
  ],
  completionPolicy: 'individual',
  visibility: 'public',
  maxParticipants: 10,
  ...overrides,
});

describe('EventScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useScheduledQuestsStore.getState().reset();
    useUserStore.setState({ user: { id: 'me' } } as any);
  });

  it('renders countdown, roster and Register for a pending event I have not joined', () => {
    useScheduledQuest.mockReturnValue({ data: baseRun(), isLoading: false });
    render(<EventScreen />);
    expect(screen.getByText('5am run club')).toBeTruthy();
    expect(screen.getByText(/Starts in/)).toBeTruthy();
    expect(screen.getByText('Thorin')).toBeTruthy();
    expect(screen.getByText('Register')).toBeTruthy();
  });

  it('shows Leave (not Register) when I am already registered, and Cancel when I am the creator', () => {
    useUserStore.setState({ user: { id: 'creator' } } as any);
    useScheduledQuest.mockReturnValue({ data: baseRun(), isLoading: false });
    render(<EventScreen />);
    expect(screen.getByText('Cancel event')).toBeTruthy();
    expect(screen.queryByText('Register')).toBeNull();
  });

  it('offers late join for an active run inside the window when I am not a participant', () => {
    useScheduledQuest.mockReturnValue({
      data: baseRun({ status: 'active', scheduledStartAt: new Date(Date.now() - 5 * 60_000).toISOString() }),
      isLoading: false,
    });
    render(<EventScreen />);
    expect(screen.getByText(/Happening now/)).toBeTruthy();
    expect(screen.getByText('Join and take part')).toBeTruthy();
  });

  it('shows too-late state for an active run past the window', () => {
    useScheduledQuest.mockReturnValue({
      data: baseRun({ status: 'active', scheduledStartAt: new Date(Date.now() - 20 * 60_000).toISOString() }),
      isLoading: false,
    });
    render(<EventScreen />);
    expect(screen.getByText(/too late to join/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — verify fail**, then implement `src/app/scheduled-quest/[id].tsx`:

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';

import {
  useCancelScheduledQuest,
  useJoinScheduledQuest,
  useKickParticipant,
  useLeaveScheduledQuest,
  useScheduledQuest,
} from '@/api/scheduled-quests';
import { ActivityIndicator, Button, FocusAwareStatusBar, ScreenContainer, Text, View } from '@/components/ui';
import { CancelledView } from '@/features/scheduled-quests/components/cancelled-view';
import { ResultsView } from '@/features/scheduled-quests/components/results-view';
import { RosterRow } from '@/features/scheduled-quests/components/roster-row';
import { useScheduledQuestRoom } from '@/features/scheduled-quests/hooks/use-scheduled-quest-room';
import { useTakePart } from '@/features/scheduled-quests/hooks/use-take-part';
import { participantUserId } from '@/features/scheduled-quests/lib/participants';
import { isJoinable, type ScheduledQuestRun } from '@/features/scheduled-quests/types';
import { scheduledQuestErrorMessage } from '@/lib/services/scheduled-quest-service';
import { useScheduledQuestsStore } from '@/store/scheduled-quests-store';
import { useUserStore } from '@/store/user-store';

const formatCountdown = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${String(s).padStart(2, '0')}s`;
};

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const userId = useUserStore((s) => s.user?.id);
  const { data: run, isLoading } = useScheduledQuest(id);
  const settlement = useScheduledQuestsStore((s) => (id ? s.settlements[id] : undefined));
  const joinMutation = useJoinScheduledQuest();
  const leaveMutation = useLeaveScheduledQuest();
  const cancelMutation = useCancelScheduledQuest();
  const kickMutation = useKickParticipant();
  const { takePart, isArming } = useTakePart(run);
  const [cancelledLive, setCancelledLive] = useState(false);
  useScheduledQuestRoom(id, { onCancelled: () => setCancelledLive(true) });

  // 1s ticker drives the countdown; the flip to "Take part" comes from the
  // server (questStarted invalidation or the poll), never the local clock.
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading || !run) {
    return (
      <ScreenContainer>
        <ActivityIndicator className="mt-20" />
      </ScreenContainer>
    );
  }

  const amParticipant = run.participants.some((p) => participantUserId(p) === userId);
  const myEntry = run.participants.find((p) => participantUserId(p) === userId);
  const amCreator = participantUserId(run.participants[0]) === userId;

  const renderBody = (r: ScheduledQuestRun) => {
    if (cancelledLive || r.status === 'cancelled') return <CancelledView run={r} />;
    if (r.status === 'completed' || settlement) return <ResultsView run={r} settlement={settlement} />;
    if (r.status === 'failed') return <CancelledView run={r} />;

    const startMs = new Date(r.scheduledStartAt).getTime();
    const joinable = isJoinable(r, nowMs);

    return (
      <>
        {r.status === 'pending' ? (
          <View className="items-center py-6">
            <Text className="text-sm text-neutral-400">Starts in</Text>
            <Text className="text-4xl font-bold">
              {startMs - nowMs > 0 ? formatCountdown(startMs - nowMs) : 'Starting…'}
            </Text>
          </View>
        ) : (
          <View className="items-center py-6">
            <Text className="text-lg font-bold text-primary-400">
              {joinable ? 'Happening now!' : 'In progress'}
            </Text>
          </View>
        )}

        <Text className="mb-2 font-semibold">
          Roster ({r.participants.length}/{r.maxParticipants})
        </Text>
        {r.participants.map((p, index) => (
          <RosterRow
            key={participantUserId(p) ?? index}
            participant={p}
            isCreator={index === 0}
            runStatus={r.status}
            onKick={
              amCreator && r.status === 'pending' && index !== 0 && participantUserId(p)
                ? () => kickMutation.mutate({ questRunId: r.id, userId: participantUserId(p) as string })
                : undefined
            }
          />
        ))}

        <View className="mt-6">
          {r.status === 'pending' && !amParticipant && (
            <Button
              label="Register"
              loading={joinMutation.isPending}
              onPress={() => joinMutation.mutate(r.id)}
            />
          )}
          {r.status === 'pending' && amParticipant && !amCreator && (
            <Button
              label="Leave event"
              variant="outline"
              loading={leaveMutation.isPending}
              onPress={() => leaveMutation.mutate(r.id, { onSuccess: () => router.back() })}
            />
          )}
          {r.status === 'pending' && amCreator && (
            <Button
              label="Cancel event"
              variant="destructive"
              loading={cancelMutation.isPending}
              onPress={() => cancelMutation.mutate(r.id, { onSuccess: () => router.back() })}
            />
          )}
          {r.status === 'active' && joinable && amParticipant && myEntry?.status === 'active' && (
            <Button label="Take part" loading={isArming} onPress={takePart} />
          )}
          {r.status === 'active' && joinable && !amParticipant && (
            <Button
              label="Join and take part"
              loading={joinMutation.isPending}
              onPress={() => joinMutation.mutate(r.id)}
            />
          )}
          {r.status === 'active' && !joinable && !amParticipant && (
            <Text className="text-center text-neutral-400">It's too late to join this one - find the next event!</Text>
          )}
          {joinMutation.error ? (
            <Text className="mt-2 text-center text-sm text-red-400">
              {scheduledQuestErrorMessage(joinMutation.error)}
            </Text>
          ) : null}
        </View>
      </>
    );
  };

  return (
    <ScreenContainer>
      <FocusAwareStatusBar />
      <ScrollView className="flex-1 px-4">
        <Text className="py-3 text-xl font-bold">{run.quest.title}</Text>
        <Text className="text-sm text-neutral-400">
          {run.quest.durationMinutes} min · {run.quest.category} · {run.quest.reward.xp} XP
        </Text>
        {renderBody(run)}
      </ScrollView>
    </ScreenContainer>
  );
}
```

Until Task 18 lands, add temporary stub components so the file compiles: `results-view.tsx` and `cancelled-view.tsx` each rendering a one-line `<Text>` placeholder (they get real implementations + tests in Task 18). Note: after a successful join of an **active** run, the invalidation refetches and `amParticipant` flips — the button naturally becomes "Take part".

- [ ] **Step 3: Run — verify pass** (`pnpm test event-screen`), commit:
```bash
git add src/app/scheduled-quest src/features/scheduled-quests/components
git commit -m "feat(scheduled): event screen lobby states (countdown, roster, join/leave/cancel/kick)"
```

### Task 17: T-0 handoff — "Take part"

**Files:**
- Create: `src/features/scheduled-quests/hooks/use-take-part.ts`, `use-take-part.test.tsx`
- Modify: `src/store/types.ts` (optional `completionPolicy` on `CooperativeQuestRun`)
- Modify: `src/app/cooperative-pending-quest.tsx` (conditional lock copy)
- Test: extend `src/app/cooperative-pending-quest.test.tsx`

- [ ] **Step 1: Failing hook tests:**

```tsx
import { renderHook, act } from '@testing-library/react-native';

import QuestTimer from '@/lib/services/quest-timer';
import { useQuestStore } from '@/store/quest-store';

import { useTakePart } from './use-take-part';

jest.mock('expo-router', () => {
  const push = jest.fn();
  return { useRouter: () => ({ push }), __push: push };
});
jest.mock('@/lib/services/quest-timer', () => ({
  __esModule: true,
  default: { prepareQuest: jest.fn().mockResolvedValue(undefined) },
}));

const run = {
  id: 'r1',
  status: 'active',
  scheduledStartAt: '2030-01-01T05:00:00.000Z',
  actualStartTime: '2030-01-01T05:00:01.000Z',
  scheduledEndTime: '2030-01-01T06:00:00.000Z',
  quest: { title: '5am run club', category: 'fitness', durationMinutes: 60, mode: 'cooperative', reward: { xp: 180 } },
  participants: [
    { userId: { id: 'creator', character: { name: 'Thorin', type: 'knight', level: 4 } }, ready: false, phoneLocked: false, status: 'active' },
    { userId: { id: 'me', character: { name: 'Bilbo', type: 'scout', level: 2 } }, ready: false, phoneLocked: false, status: 'active' },
  ],
  completionPolicy: 'individual',
  visibility: 'public',
  maxParticipants: 10,
} as any;

describe('useTakePart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useQuestStore.setState({ cooperativeQuestRun: null, pendingQuest: null } as any);
  });

  it('mirrors the coop handoff: store run, prepare template, arm QuestTimer with the run id, navigate', async () => {
    const { result } = renderHook(() => useTakePart(run));
    await act(() => result.current.takePart());

    const state = useQuestStore.getState();
    expect(state.cooperativeQuestRun?.id).toBe('r1');
    expect(state.cooperativeQuestRun?.status).toBe('active');
    expect(state.cooperativeQuestRun?.completionPolicy).toBe('individual');
    expect(state.pendingQuest?.title).toBe('5am run club');
    // mode MUST be 'cooperative' or the navigation resolver routes the armed
    // quest to the solo /pending-quest screen (see D9).
    expect(state.pendingQuest?.mode).toBe('cooperative');
    expect(state.pendingQuest?.category).toBe('cooperative');
    expect(QuestTimer.prepareQuest).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'cooperative', category: 'cooperative', durationMinutes: 60 }),
      'r1'
    );
    const { __push } = jest.requireMock('expo-router');
    expect(__push).toHaveBeenCalledWith('/cooperative-pending-quest');
  });
});
```

- [ ] **Step 2: Run — verify fail**, then implement.
  First the type: in `src/store/types.ts`, add to `CooperativeQuestRun` (after `status`):

```ts
  /** 'individual' for scheduled events - your unlock fails only you. */
  completionPolicy?: 'all_or_nothing' | 'individual';
```

Then `src/features/scheduled-quests/hooks/use-take-part.ts`:

```ts
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import QuestTimer from '@/lib/services/quest-timer';
import { useQuestStore } from '@/store/quest-store';
import { type CustomQuestTemplate } from '@/store/types';

import { participantUserId } from '../lib/participants';
import { type ScheduledQuestRun } from '../types';

/**
 * T-0 handoff (spec §3/§6): hand the already-active server run to the
 * standard cooperative start machinery, exactly like
 * cooperative-quest-ready.tsx's handleQuestCreatedResponse:
 * setCooperativeQuestRun -> prepareQuest -> QuestTimer.prepareQuest with an
 * explicit questRunId -> /cooperative-pending-quest. The physical phone
 * lock remains the real trigger; QuestTimer's coop branch then anchors the
 * local timer to the server's actualStartTime, so the countdown ends at the
 * shared Tend even for late lock-ins.
 *
 * The template MUST be mode 'cooperative' (same literal as the ready
 * screen): navigation-state-resolver.ts:156 treats only
 * pendingQuest.mode === 'cooperative' as cooperative, and any other mode
 * makes the NavigationGate push the solo /pending-quest screen on
 * relaunch/foreground while armed. CustomQuestTemplate types mode as
 * 'custom', hence the localized cast below - do not widen the shared type
 * or edit the resolver (out of scope, and #324 touches the resolver).
 */
export function useTakePart(run: ScheduledQuestRun | undefined) {
  const router = useRouter();
  const [isArming, setIsArming] = useState(false);

  const takePart = useCallback(async () => {
    if (!run || isArming) return;
    setIsArming(true);
    try {
      const questTemplate = {
        id: `scheduled-${run.id}`,
        title: run.quest.title,
        durationMinutes: run.quest.durationMinutes,
        reward: { xp: run.quest.reward.xp },
        mode: 'cooperative', // resolver contract - see docstring
        category: 'cooperative',
      } as unknown as CustomQuestTemplate;
      const questStore = useQuestStore.getState();
      questStore.setCooperativeQuestRun({
        id: run.id,
        questId: questTemplate.id,
        hostId: participantUserId(run.participants[0]) ?? '',
        status: 'active',
        completionPolicy: run.completionPolicy,
        participants: run.participants.map((p) => ({
          userId: participantUserId(p) ?? '',
          ready: p.ready,
          status: 'active',
          phoneLocked: p.phoneLocked,
        })),
        actualStartTime: run.actualStartTime ? new Date(run.actualStartTime).getTime() : undefined,
        scheduledEndTime: run.scheduledEndTime ? new Date(run.scheduledEndTime).getTime() : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      questStore.prepareQuest(questTemplate);
      await QuestTimer.prepareQuest(questTemplate, run.id);
      router.push('/cooperative-pending-quest');
    } finally {
      setIsArming(false);
    }
  }, [run, isArming, router]);

  return { takePart, isArming };
}
```

- [ ] **Step 3: Run — verify pass:** `pnpm test use-take-part`

- [ ] **Step 4: Conditional lock copy.** In `src/app/cooperative-pending-quest.tsx`, the lock-instruction `<Text>` (line ~439) currently reads `All companions must lock phones to begin` — false under individual policy. Read `cooperativeQuestRun` from the store (already available in the component) and replace the string with:

```tsx
{cooperativeQuestRun?.completionPolicy === 'individual'
  ? 'Lock your phone to take part - an early unlock only fails you'
  : 'All companions must lock phones to begin'}
```

Also update the smaller "All companions must lock together" copy in the countdown view (line ~200) the same way if it renders on this path. First add a failing case to `src/app/cooperative-pending-quest.test.tsx` (existing store-seeding pattern): seed `cooperativeQuestRun` with `completionPolicy: 'individual'` and assert the new copy; seed without it and assert the classic copy unchanged.

- [ ] **Step 5: Run the pending-screen tests** (`pnpm test cooperative-pending-quest`) — both policies' copy asserted, everything else green.

- [ ] **Step 6: Commit.**
```bash
git add src/features/scheduled-quests/hooks src/store/types.ts src/app/cooperative-pending-quest.tsx src/app/cooperative-pending-quest.test.tsx
git commit -m "feat(scheduled): Take-part handoff into the cooperative start flow"
```

### Task 18: Results and cancelled views

**Files:**
- Create (replacing Task 16 stubs): `src/features/scheduled-quests/components/results-view.tsx` + test, `cancelled-view.tsx` + test

Data contract: live settlements arrive as `quest:settled {questRunId, completedAt, participants:[{userId, status, xpAwarded, creditFailed?}]}` (userIds only). A later fetch of the completed run has populated participants with `status` and `rewards.adjustedXP`. The view therefore takes both: names come from the run's roster, statuses/XP prefer the settlement payload, falling back to run data (`xp = rewards.adjustedXP` **only** when `status === 'completed'` — failed/no_show may carry stale activation-time reward numbers).

- [ ] **Step 1: Failing tests:**

```tsx
import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { ResultsView } from './results-view';

const run = {
  id: 'r1',
  status: 'completed',
  scheduledStartAt: '2030-01-01T05:00:00.000Z',
  quest: { title: 't', category: 'fitness', durationMinutes: 60, mode: 'cooperative', reward: { xp: 180 } },
  participants: [
    { userId: { id: 'u1', character: { name: 'Thorin', type: 'knight', level: 4 } }, ready: false, phoneLocked: true, status: 'completed', rewards: { baseXP: 180, adjustedXP: 216, multiplier: 1.2, perksApplied: [] } },
    { userId: { id: 'u2', character: { name: 'Bilbo', type: 'scout', level: 2 } }, ready: false, phoneLocked: false, status: 'no_show', rewards: { baseXP: 180, adjustedXP: 180, multiplier: 1, perksApplied: [] } },
    { userId: { id: 'u3', character: { name: 'Gimli', type: 'druid', level: 3 } }, ready: false, phoneLocked: true, status: 'failed' },
  ],
  completionPolicy: 'individual',
  visibility: 'public',
  maxParticipants: 10,
} as any;

describe('ResultsView', () => {
  it('classifies the roster from run data and only credits completed participants', () => {
    render(<ResultsView run={run} />);
    expect(screen.getByText(/Showed up/)).toBeTruthy();
    expect(screen.getByText('Thorin')).toBeTruthy();
    expect(screen.getByText('+216 XP')).toBeTruthy();
    expect(screen.getByText(/No-shows/)).toBeTruthy();
    expect(screen.getByText('Bilbo')).toBeTruthy();
    expect(screen.queryByText('+180 XP')).toBeNull(); // no_show never shows XP
    expect(screen.getByText(/Dropped out/)).toBeTruthy();
    expect(screen.getByText('Gimli')).toBeTruthy();
  });

  it('prefers the live settlement payload when present', () => {
    const settlement = {
      questRunId: 'r1',
      completedAt: '2030-01-01T06:00:00.000Z',
      participants: [
        { userId: 'u1', status: 'completed', xpAwarded: 300 },
        { userId: 'u2', status: 'no_show', xpAwarded: 0 },
        { userId: 'u3', status: 'failed', xpAwarded: 0 },
      ],
    } as any;
    render(<ResultsView run={run} settlement={settlement} />);
    expect(screen.getByText('+300 XP')).toBeTruthy();
  });

  it('flags a failed XP credit', () => {
    const settlement = {
      questRunId: 'r1',
      completedAt: 'x',
      participants: [{ userId: 'u1', status: 'completed', xpAwarded: 0, creditFailed: true }],
    } as any;
    render(<ResultsView run={run} settlement={settlement} />);
    expect(screen.getByText(/XP pending/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — verify fail**, implement `results-view.tsx`:

```tsx
import React from 'react';

import { Text, View } from '@/components/ui';
import { type QuestSettledPayload } from '@/lib/services/websocket-events.types';

import { participantDisplayName, participantUserId } from '../lib/participants';
import { type ScheduledParticipant, type ScheduledQuestRun } from '../types';

interface Props {
  run: ScheduledQuestRun;
  settlement?: QuestSettledPayload;
}

interface Entry {
  name: string;
  status: 'completed' | 'failed' | 'no_show';
  xp: number;
  creditFailed?: boolean;
}

const entryFor = (p: ScheduledParticipant, settlement?: QuestSettledPayload): Entry => {
  const id = participantUserId(p);
  const settled = settlement?.participants.find((s) => s.userId === id);
  if (settled) {
    return { name: participantDisplayName(p), status: settled.status, xp: settled.xpAwarded, creditFailed: settled.creditFailed };
  }
  const status = p.status === 'active' ? 'no_show' : p.status; // settlement writes finals; 'active' remainder = never settled visibly
  return {
    name: participantDisplayName(p),
    status: status as Entry['status'],
    // Only completed participants earned their stored reward - failed/no_show
    // can carry stale activation-time reward numbers.
    xp: status === 'completed' ? (p.rewards?.adjustedXP ?? 0) : 0,
  };
};

const SECTIONS: { key: Entry['status']; title: string }[] = [
  { key: 'completed', title: 'Showed up and finished' },
  { key: 'no_show', title: 'No-shows' },
  { key: 'failed', title: 'Dropped out early' },
];

export function ResultsView({ run, settlement }: Props) {
  const entries = run.participants.map((p) => entryFor(p, settlement));
  return (
    <View className="py-4">
      <Text className="mb-4 text-center text-lg font-bold">Who showed up</Text>
      {SECTIONS.map(({ key, title }) => {
        const rows = entries.filter((e) => e.status === key);
        if (rows.length === 0) return null;
        return (
          <View key={key} className="mb-4">
            <Text className="mb-2 font-semibold text-neutral-300">{title}</Text>
            {rows.map((e) => (
              <View key={e.name + key} className="mb-1 flex-row items-center justify-between rounded-lg bg-neutral-800/40 px-3 py-2">
                <Text>{e.name}</Text>
                {e.status === 'completed' ? (
                  <Text className="font-semibold text-primary-400">{e.creditFailed ? 'XP pending' : `+${e.xp} XP`}</Text>
                ) : null}
              </View>
            ))}
          </View>
        );
      })}
      <Text className="mt-2 text-center text-sm text-neutral-400">Completions count toward your streak.</Text>
    </View>
  );
}
```

and `cancelled-view.tsx`:

```tsx
import React from 'react';

import { Text, View } from '@/components/ui';

import { type ScheduledQuestRun } from '../types';

export function CancelledView({ run }: { run: ScheduledQuestRun }) {
  return (
    <View className="items-center py-10">
      <Text className="text-lg font-bold">This event was cancelled</Text>
      <Text className="mt-2 text-center text-neutral-400">
        {run.cancellationReason ?? 'The event is no longer happening.'}
      </Text>
    </View>
  );
}
```

with a small test asserting the title and reason render.

- [ ] **Step 3: Run — verify pass** (also re-run the event-screen tests from Task 16), commit:
```bash
git add src/features/scheduled-quests/components
git commit -m "feat(scheduled): settlement results and cancelled views"
```

### Task 19: Push-notification routing

**Files:**
- Modify: `src/app/_layout.tsx` (OneSignal click handler, lines ~207-227)
- Test: extend `src/app/_layout.test.tsx`

Server payloads are `{type, questRunId}` with types `scheduled_quest_starting_soon` (T-10), `scheduled_quest_started` (T-0), `scheduled_quest_cancelled`, `scheduled_quest_kicked` — there is no settlement push.

- [ ] **Step 1: Failing tests.** Follow `_layout.test.tsx`'s existing pattern for simulating a notification click; add cases:
  - each of `scheduled_quest_starting_soon` / `scheduled_quest_started` / `scheduled_quest_cancelled` with `questRunId: 'r1'` → `router.push('/scheduled-quest/r1')`
  - `scheduled_quest_kicked` → `router.push('/scheduled-quest')`
  - the existing `cooperative_quest_invitation` case still routes unchanged.

- [ ] **Step 2: Run — verify fail.**

- [ ] **Step 3: Implement.** In the `OneSignal.Notifications.addEventListener('click', …)` handler, after the existing `cooperative_quest_invitation` branch:

```ts
} else if (
  additionalData?.questRunId &&
  ['scheduled_quest_starting_soon', 'scheduled_quest_started', 'scheduled_quest_cancelled'].includes(
    additionalData?.type
  )
) {
  // Deep-link into the event screen; it renders lobby / take-part /
  // cancelled from the fetched run state, so one route serves all three.
  setTimeout(() => {
    router.push(`/scheduled-quest/${additionalData.questRunId}`);
  }, 1000);
} else if (additionalData?.type === 'scheduled_quest_kicked') {
  setTimeout(() => {
    router.push('/scheduled-quest');
  }, 1000);
}
```

- [ ] **Step 4: Run — verify pass** (`pnpm test src/app/_layout`), commit:
```bash
git add src/app/_layout.tsx src/app/_layout.test.tsx
git commit -m "feat(scheduled): route scheduled_quest_* pushes to the event screens"
```

### Task 20: Entry points

**Files:**
- Modify: `src/app/cooperative-quest-menu.tsx` (menu entry)
- Modify: `src/app/join-cooperative-quest.tsx` (replace Coming-Soon mock, lines ~320-429)
- Tests: extend both screens' existing test files (or create matching `*.test.tsx` following the discovery-screen test pattern)

- [ ] **Step 1: Failing tests:** menu renders a "Public Events" option routing to `/scheduled-quest`; join screen renders a live "Public Events" section (no "Coming Soon" text anywhere) whose CTA routes to `/scheduled-quest`.

- [ ] **Step 2: Run — verify fail.**

- [ ] **Step 3: Implement.**
  - `cooperative-quest-menu.tsx`: add to the `menuOptions` array (after the `join` entry), importing `CalendarClock` from `lucide-react-native`:

```ts
  {
    id: 'events',
    title: 'Public Events',
    description: 'Discover and register for scheduled community quests',
    icon: <CalendarClock size={32} color="#FFFFFF" />,
    route: '/scheduled-quest',
    color: 'bg-primary-400',
  },
```

  - `join-cooperative-quest.tsx`: delete the whole "Public Quests Section - Coming Soon" block (the `<View className="mt-8">`…`</View>` wrapping the badge, the mock card array, and the `InfoCard`, lines ~320-429) and replace with:

```tsx
            {/* Public Events */}
            <View className="mt-8">
              <Text className="mb-2 text-lg font-semibold" style={{ fontWeight: '700' }}>
                Public Events
              </Text>
              <Text className="mb-3 text-sm" style={{ color: colors.neutral[200] }}>
                Join scheduled quests from the community - register now, show up at start time.
              </Text>
              <TouchableOpacity
                testID="browse-public-events"
                onPress={() => router.push('/scheduled-quest')}
                className="rounded-lg px-4 py-3"
                style={{ backgroundColor: colors.primary[400] }}
              >
                <Text className="text-center text-sm font-semibold text-white" style={{ fontWeight: '600' }}>
                  Browse public events
                </Text>
              </TouchableOpacity>
            </View>
```

  Keep the section rendering in the `invitations.length === 0` branch where the mock lived (the menu entry covers the other path). Remove now-unused imports (`InfoCard`, `User`, `Clock` etc.) only if nothing else in the file uses them.

- [ ] **Step 4: Run — verify pass** (both screens' test files + `pnpm type-check` vs baseline), commit:
```bash
git add src/app/cooperative-quest-menu.tsx src/app/join-cooperative-quest.tsx
git commit -m "feat(scheduled): entry points from coop menu and join screen"
```

### Task 21: Final verification and PR

- [ ] **Step 1: Full mobile check** from the worktree: `pnpm check-all`. Compare against the Task 7 baseline — zero *new* lint/type/test failures. Fix any regression before proceeding (@superpowers:verification-before-completion — paste actual output, no claims without evidence).
- [ ] **Step 2: Manual end-to-end pass** (requires the Phase 0 server running locally: `npm run dev` in the server repo — dev mode relaxes the lead floor to 10 s; `scripts/scheduled-quest-probe.js` can drive a second participant):
  1. Create an event ~2 minutes out (public, 30 min) → lands on the lobby with the countdown.
  2. Second account (probe or second simulator) joins → roster updates live without refresh.
  3. At T-0 the lobby flips to "Take part" (push arrives if OneSignal is configured locally; otherwise the socket/poll flips it) → tap → coop pending screen shows the individual-policy copy → lock the phone → quest runs with the timer ending at Tend.
  4. Let it settle → results screen classifies completed/no-show correctly, XP appears for completers.
  5. Verify a discovery-listed event from a *non-participant* account opens the lobby (detail endpoint) and that joining an overlapping second event returns the 409 message in the UI.
- [ ] **Step 3: Finish the branch** per @superpowers:finishing-a-development-branch — push `feat/scheduled-quests-mobile` and open a draft PR against `main` in the mobile repo. The PR body must state the server dependency: **requires `feat/scheduled-quests-v2` (server) deployed — merges to server `main` auto-deploy via Render.** No Claude attribution anywhere.

---

## Explicitly out of scope (from spec §13 — do not build)

Prorated XP; moderation/reporting; ready-up/auto-start; recurrence (`seriesId` stays null); event↔solo-quest overlap warnings; any presence-rework (`/begin`, `/confirm`, `enforcement`) integration; refactoring the WebSocket-provider/invitation tangle; edits to `QuestTimer`, `useLockStateDetection`, `quest-store`'s rehydrate logic, or the navigation-state-resolver.
