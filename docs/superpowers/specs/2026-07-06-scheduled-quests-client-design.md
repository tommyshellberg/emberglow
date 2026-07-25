# Scheduled Quests (Events) — Client Design Spec

**Date:** 2026-07-06
**Status:** Draft — pending spec review + user sign-off
**Scope:** UnQuest mobile app (`/unquest`). Primarily client-side, with a small, enumerated set of server prerequisites on the still-unmerged `feat/scheduled-quests-v2` branch (§10). The server feature itself is designed and implemented; this spec covers the client that consumes it, plus the deltas the client's product decisions require.

---

## 1. Problem & framing

Cooperative quests today are private, invitation-driven, and all-or-nothing (one participant unlocking their phone fails the run for everyone). There is no way to discover and join a stranger's quest, and no way to plan one for a future time.

**A scheduled quest is an "Event": a public cooperative quest people register for ahead of time and are notified about before it starts.** It differs from today's coop quest in three ways:

1. **Public** — anyone can discover and join (subject to `visibility: public | friends`).
2. **Individual failure** — your early unlock fails only *you*; the run continues for everyone else (`completionPolicy: 'individual'`).
3. **Register now, run later** — you join a *signup list* and do not hold a quest run while you wait. You can be registered for many (non-overlapping) events and freely run other quests in the meantime. The run only becomes *yours* — entering your single active-quest slot — at start time, when you lock in.

The retention lever is social accountability: a visible roster of who signed up, who showed up, and who finished.

### The key implementation nuance

To the user, an Event is "a signup list that becomes a quest when it starts." Server-side, that signup list **is** a `QuestRun` — it exists from creation as a `pending` run with `scheduledStartAt` set, and "registering" is `POST /:id/join` adding you to its `participants[]`. The server does not create the run at T-0; it flips the already-existing `pending` run to `active`. The user-facing model holds exactly; the client *exploits* the early-existing run (stable ID, a room to join, a roster to render) rather than fighting it.

---

## 2. Guiding constraint: ship independently of the presence rework

A separate in-flight effort ("Unified Quest Presence", mobile draft PR #324) reworks quest start into a focus-timer model (tap-to-start, no lock required, lock-for-bonus). **Scheduled Events must ship on the *current* mechanic without waiting on or absorbing that work**, while not blocking it.

The discipline that guarantees this:

- **Additive only.** New feature module, new store, new screens, new API/WebSocket listeners. **Zero edits to `QuestTimer` or the quest-start internals** — the scheduled feature *composes* the existing start machinery, never forks or modifies it. This keeps the two branches orthogonal and mergeable in any order.
- **Physical phone-lock is the sole start trigger** (an architectural invariant today: `useLockStateDetection` → `QuestTimer.onPhoneLocked` → server lock-in). There is no programmatic "auto-start". The scheduled feature *must* funnel through the lock seam — which is exactly why composing `QuestTimer` is correct.
- **Do not touch the presence-only API** (`/begin`, `/confirm`, `enforcement: 'presence'`, `lockedDurationMs`). None of it is in the shipping baseline. When presence lands, the scheduled feature inherits tap-to-start *for free* through the shared start seam; the only casualty is copy ("lock your phone" → whatever presence says), not logic.

---

## 3. Architecture overview: bookends + inherited middle

The Event lifecycle has a clean handoff seam at T-0:

```
  PRE-START  (new scheduled surface)          T-0 handoff        IN-RUN (inherited)            SETTLEMENT (new)
  ┌─────────────────────────────┐             ┌──────────┐       ┌───────────────────────┐    ┌──────────────┐
  create → discover → register → │  lobby +   │ "Take    │  →    │ cooperative-pending-  │ →  │ "who showed  │
  │  countdown + live roster     │  T-10 push │  part" →  │       │ quest → lock phone →  │    │  up" screen  │
  └─────────────────────────────┘             │ lock seam│       │ QuestTimer → complete │    └──────────────┘
   scheduled-quests-store                      └──────────┘        quest-store (coop path)      quest:settled
```

- **Pre-start** and **settlement** are the only genuinely new surfaces we build.
- **In-run**, a locked-in Event *is* a normal cooperative quest run — it reuses `quest-store.cooperativeQuestRun`, `QuestTimer.prepareQuest`, the `cooperative-pending-quest` lock screen, lock detection, background tracking, and completion. No new in-run code.

This is what "lean on the cooperative quest flow" cashes out to: reuse its screens *and* its in-run state machine, but give the pre-start life its own lighter surface that never touches the active-quest singleton.

---

## 4. State model

### New: `scheduled-quests-store` (Zustand + MMKV), separate from `quest-store`

| Field | Purpose |
|---|---|
| `discoveryCache: QuestRun[]` | Last-fetched discovery feed (future events + running-but-joinable). |
| `myRegistrations: QuestRun[]` | Events I've joined that haven't started/finished — the "My events" list. Source of truth: server `GET /scheduled/mine` (§10-A). |
| `runsById: Record<id, QuestRun>` | Per-event cache for the lobby screen; updated by fetch + WebSocket room events. |

Actions (indicative): `setDiscovery`, `setMyRegistrations`, `upsertRun`, `applyParticipantJoined/Left`, `applyCancelled`, `applySettled`, `removeRegistration`. Rehydrate refreshes `myRegistrations` on launch/foreground (re-fetch, not trust-stale) so reinstall / multi-device stays correct.

### `quest-store` is untouched until T-0

Registrations are a *list* and never occupy the `activeQuest` / `pendingQuest` singleton. Only at T-0, when the user locks in, does the now-active run enter the existing `cooperativeQuestRun` slot via the standard coop handoff.

> **Why a separate store, not an array on `quest-store`:** future-commitment state has a different lifecycle from the in-progress singleton, and `quest-store.onRehydrateStorage` already carries heavy, fragile cleanup logic. Keeping registrations out of it avoids risk to the solo/coop flows and keeps concerns separable.

---

## 5. Client surface

### 5.1 API module — `src/lib/services/scheduled-quest-service.ts`

Provisional-aware (mirrors the existing quest-run service's client-selection pattern). Functions:

| Function | Call |
|---|---|
| `createScheduledQuest(input)` | `POST /quest-runs/scheduled` |
| `discoverScheduledQuests(params)` | `GET /quest-runs/discover` |
| `getScheduledQuest(id)` | `GET /quest-runs/:id` |
| `getMyScheduledQuests()` | `GET /quest-runs/scheduled/mine` *(server prereq §10-A)* |
| `joinScheduledQuest(id)` | `POST /quest-runs/:id/join` |
| `leaveScheduledQuest(id)` | `DELETE /quest-runs/:id/join` |
| `cancelScheduledQuest(id)` | `DELETE /quest-runs/:id` |
| `kickParticipant(id, userId)` | `DELETE /quest-runs/:id/participants/:userId` |

Lock-in reuses the **existing** `updatePhoneLockStatus`. No client ready-up call (see §6).

### 5.2 Query hooks (TanStack Query)

`useDiscoverScheduledQuests` (polled), `useMyScheduledQuests`, `useScheduledQuest(id)` (polled + WebSocket-refreshed), plus join / leave / cancel / kick mutations that invalidate the relevant keys and update the store.

### 5.3 Screens (new routes under `src/app/scheduled-quest/`)

- **Discovery feed** — browse public events, with **Discover** and **My events** tabs. Shows future events *and* running-but-still-joinable ones (grace window, §8). Visual base: repurpose the orphaned `(app)/quest-discovery.tsx` placeholder and the "Public Quests — Coming Soon" mock card in `join-cooperative-quest.tsx` (host / duration / participants `12/20` / "Starts in…").
- **Event lobby — `scheduled-quest/[id].tsx`** — the heart of the feature: countdown to start, **live roster** (reuse `ParticipantRow`), register / deregister, creator cancel + kick, and the **"Take part"** action at T-0. Backed by `GET /:id` + the questRun room.
- **Create event — `scheduled-quest/create.tsx`** — reuse `QuestForm` building blocks (`CombinedQuestInput`, `CategorySlider`) plus a **date/time picker**; fields: title, category, durationMinutes, scheduledStartAt, visibility (`public`/`friends`), maxParticipants. Any user may create.
- **Settlement "who showed up" — `scheduled-quest/[id]/results.tsx`** (or a result view) — rendered from `quest:settled`: roster classified `completed` / `no_show` / `failed` with per-participant XP. Reuse the reward-breakdown components (`reward-breakdown-card`, `compact-reward-breakdown`).

### 5.4 WebSocket integration

A **scoped hook** (mounted by the lobby screen) that calls `joinQuestRoom(questRunId)` and listens for the server's room events, updating `scheduled-quests-store`:

| Event | Client reaction |
|---|---|
| `quest:participant-joined` `{questRunId,userId,participantCount}` | upsert roster |
| `quest:participant-left` `{...,kicked?}` | remove from roster |
| `lobby:ready-status` | (ignored in v1 — no ready-up) |
| `questStarted` `{questRunId,startedAt,expiresAt}` | flip lobby to "Take part"; begin T-0 handoff |
| `quest:participant-failed` `{questRunId,userId,reason}` | mark participant failed in roster |
| `quest:settled` `{questRunId,completedAt,participants[]}` | render settlement screen |
| `quest:cancelled` `{questRunId,reason}` | toast + pop the lobby, drop registration |

**Additive only:** use the existing lazy WebSocket provider's `connect()` and add listeners in this scoped hook. Do **not** add a fourth provider (the existing three-provider tangle stays untouched). Server-side reconnect already auto-rejoins questRun rooms for pending/active participations.

### 5.5 Deep links / notifications

The server already sends the pushes; the client must route them. Payloads carry `{ type, questRunId }` and **no URL**, so we map push `type` → route in the OneSignal click handler in `_layout.tsx`:

| Push `type` | Route |
|---|---|
| `scheduled_quest_starting_soon` (T-10) | `/scheduled-quest/[id]` (lobby) |
| `scheduled_quest_started` (T-0) | `/scheduled-quest/[id]` (lobby, at "Take part") |
| `scheduled_quest_cancelled` | `/scheduled-quest/[id]` (shows cancelled) or discovery, with a toast |
| `scheduled_quest_kicked` | discovery, with a toast |

---

## 6. Lobby interaction

- **Register = the commitment** (`join`). It blocks overlaps (§9). There is **no ready-up in v1** — its only proposed purpose was to enable auto-start, which is architecturally impossible today (see §2). The server's `ready` flag / `lobby:ready-status` go unused. *(Ready → auto-begin becomes buildable later, once the presence rework lands; deferring it now costs nothing.)*
- The live roster already communicates "who's in", so a separate "I'm here" signal is unnecessary for v1.
- **At T-0**, `questStarted` fires and the lobby surfaces a **"Take part"** action → transitions to the existing **"lock your phone to begin"** screen (coop pending flow) → the physical lock starts the run via `QuestTimer`. The button *arms* the lock flow; the lock is the real trigger.
- **Miss the window** (never lock in by the 25% cutoff) → `no_show`, no penalty, recorded in settlement.

---

## 7. Lifecycle walkthrough (client ↔ server)

1. **Create.** `POST /quest-runs/scheduled` → server returns a `pending` run (`completionPolicy: 'individual'`, `quest.reward.xp = durationMinutes × 3`, creator as `participants[0]`). Client adds it to `myRegistrations`, navigates to its lobby.
2. **Discover.** `GET /discover` returns joinable events. Client renders the feed; entry point from the cooperative-quest menu ("join a public event") and/or a dedicated tab.
3. **Register / deregister.** `POST` / `DELETE /:id/join`. Server emits `quest:participant-joined` / `quest:participant-left` to the room; the lobby roster updates live. Overlap → `409` (§9). Full → `400`. Kicked → `403`.
4. **T-10 reminder.** Server OneSignal push `scheduled_quest_starting_soon`. Tap → lobby. Countdown is client-computed from `scheduledStartAt`.
5. **T-0 activation.** Server flips run → `active`, sets `expiresAt = Tend`, emits `questStarted` to the room and each participant's user room, sends `scheduled_quest_started` push. Client: lobby shows **"Take part"**; tapping hands the run to the coop pending/lock flow.
6. **In-run.** Standard cooperative run: `QuestTimer` + lock detection + background tracking. An early unlock emits `quest:participant-failed` for *only that user* (individual policy); the run continues for others.
7. **Settlement (Tend).** Server classifies every participant and emits `quest:settled`. Client shows the **"who showed up"** screen. Any completion counts toward the user's streak.

**Cancellation:** creator may cancel pre-start (`DELETE /:id`) → `quest:cancelled` + push to the roster. After T-0 the creator is just another participant.

---

## 8. Grace window / late join (simplified)

Resolves the server spec's open decision #4 with a *simpler* rule:

- **Join / lock-in allowed up to 25% of the duration after start** (a 60-min event: joinable/lockable from T-0 to T+15).
- **Full XP** for anyone who locks in within that window and holds to Tend. **No proration** (deferred).
- Settlement collapses to a clean three-way: locked-in by the 25% mark and held → **completed (full XP)**; unlocked early → **failed (0 XP)**; never locked in time → **no_show (0 XP, no penalty)**.
- **Discovery surfaces running-but-joinable events** (started, still inside the 25% window) — deliberate, to add social pressure to jump into something already happening.

This requires server changes (§10-C, §10-D): tighten the cutoff 50%→25%, replace prorated XP with flat full XP, and widen `/discover` to include still-joinable active runs.

---

## 9. Overlap prevention

A user **cannot register for an event whose run window intersects an existing registration.** Window = `[scheduledStartAt, scheduledStartAt + durationMinutes)`. You may hold a long list of future events; they simply can't be *live* at the same time.

- **Enforced server-side** (§10-B) — returns `409` at join. Client-only enforcement would be leaky (can't see other-device / reinstalled registrations). The server has the full participant set; the check rides on the same `scheduled/mine` capability the client needs anyway.
- Client surfaces the `409` as a clear message and best-effort annotates conflicting events in discovery using whatever registrations it knows.
- **Residual, out of scope:** this stops event↔event double-booking, but not *starting a solo/custom quest* that runs past an event's start (a pre-existing gap the server spec left out of scope). A soft client warning ("your 5am run club starts in 20 min") is a possible later add.

---

## 10. Server prerequisites (folded into this effort)

Four small changes on the still-unmerged `feat/scheduled-quests-v2` branch — cheap because it isn't merged, and all are simplifications or additive:

- **A. `GET /quest-runs/scheduled/mine`** — list the caller's `pending`/`active` scheduled registrations. Powers "My events" and the overlap check.
- **B. Overlap guard at join** — `409` if the new event's run window intersects an existing registration.
- **C. Scoring simplification** — cutoff 50%→25% elapsed; flat **full XP** for anyone locked-in-by-cutoff; delete the proration + 5-min-grace math in `scheduled-quest-scoring.js`.
- **D. Widen `/discover`** — include `active` runs still inside the 25% join window (currently filters `scheduledStartAt > now`, i.e. future only).

These are documented here as prerequisites; each ships TDD-first per the server repo's rules.

---

## 11. Error handling & edge cases (client)

| Situation | Server signal | Client behavior |
|---|---|---|
| Overlapping registration | `409` "already registered for an overlapping event" | toast; keep user in discovery |
| Event full | `400` "Quest is full" | disable Join; toast |
| Kicked, tries to rejoin | `403` | toast; remove from feed |
| Another active participation at lock-in | `409` "already have another active quest" | "Finish your current quest first" |
| Too late (past 25%) | `400` "Too late to join/lock in" | remove from feed; toast |
| Event cancelled while in lobby | `quest:cancelled` | toast; pop lobby; drop registration |
| No-show at settlement | `quest:settled` (status `no_show`) | shown in results; no penalty |
| Reinstall / second device | — | `myRegistrations` re-fetched from `scheduled/mine` on launch |

---

## 12. Testing approach (TDD, mobile Jest + RN Testing Library)

- `scheduled-quests-store` reducers: roster apply (joined/left/failed), cancelled, settled, registration add/remove.
- API service + hooks: request shapes, provisional-client selection, error mapping (409/400/403).
- Lobby: countdown from `scheduledStartAt`; T-0 `questStarted` → "Take part" transition; WebSocket room-event → roster updates.
- Deep-link routing: each `scheduled_quest_*` push type → correct route.
- Settlement rendering from a `quest:settled` payload (completed / no_show / failed).
- Discovery: future + running-but-joinable rendering; overlap annotation.

---

## 13. Explicitly deferred / out of scope

- Prorated XP for late arrivals (full XP within the 25% window instead).
- Moderation: reporting / blocklist (v1 mitigations = creator cancel + kick only; UGC-titles-to-strangers is an accepted risk per the server spec).
- Ready-up / auto-start (revisit once the presence rework lands).
- Recurrence / "run club series" (`seriesId` stays reserved, always null).
- Event↔solo-quest overlap warning.
- The presence-rework migration itself (scheduled inherits it later via the shared start seam).
- Refactoring the existing WebSocket-provider / invitation-module / participant-type tangle (additive discipline avoids touching it).

---

## 14. Decisions log

1. Scheduled quest = public cooperative "Event"; three differences: public, individual failure, register-now-run-later. *(user-confirmed)*
2. Registrations live in a dedicated store; `quest-store` singleton untouched until T-0. *(user-confirmed)*
3. In-run reuse: a locked-in Event becomes a normal coop quest run (reuse `cooperativeQuestRun` + `QuestTimer` + coop pending/lock/complete). *(user-confirmed)*
4. Additive-only discipline to stay orthogonal to presence PR #324; compose `QuestTimer`, never edit it. *(user-confirmed)*
5. No ready-up / auto-start in v1 — physical phone-lock is the only start trigger. *(user-confirmed, corrected mid-design)*
6. Grace window: join/lock-in ≤ 25% elapsed, full XP, proration deferred. *(user-confirmed; resolves server decision #4)*
7. Discovery surfaces running-but-joinable events for social pressure. *(user-confirmed)*
8. Overlap prevention, server-enforced (`409`). *(user-confirmed)*
9. v1 includes user-generated event creation, the settlement screen, and the grace-window late-join. *(user-confirmed)*
10. Four server prerequisites folded into this effort's plan. *(user-confirmed)*
