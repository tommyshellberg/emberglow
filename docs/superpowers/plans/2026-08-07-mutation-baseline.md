# Mutation testing baseline — 2026-08-07

> **STATUS 2026-08-09: the follow-up work in §5 is DONE.** All 16 prioritized items
> are implemented, plus a second pass over what the first pass left behind. Results
> and what deliberately went unfixed are in §6 at the bottom. Everything above §6 is
> preserved as the original baseline — read it for the *reasoning*, not as a to-do
> list.

Stryker pilot sweep over five modules. This document is the **handoff artifact**: it
records what the sweep found, classifies every surviving mutant, and ends with a
prioritized list of tests worth writing. It assumes no context from the session that
produced it.

- Branch: `chore/mutation-testing-pilot`
- Raw report: `reports/mutation/index.html` (2.1 MB — do not open it in an agent
  context; it has killed two sessions. Use `/tmp/mutation-report.json` with a targeted
  `node -e` / `jq` query instead.)
- **`/tmp/mutation-report.json` is not reproducible.** It was hand-extracted from
  `reports/mutation/index.html`'s embedded `app.report = {...}` JavaScript object
  literal — open it with `node -e`, not a JSON parser, since it is a JS object literal,
  not strict JSON. `stryker.config.mjs:19` sets `reporters: ['html', 'clear-text',
  'progress']` with no `json` reporter, so simply re-running Stryker will **not**
  regenerate this file. To get it back, either repeat that HTML-literal extraction
  against a fresh `index.html`, or add `'json'` to the reporters array in
  `stryker.config.mjs` before running.
- Runtime: **30m38s**, 86.08 tests run per mutant on average.
- **Do not re-run Stryker to re-read these numbers.** Everything is transcribed below.

---

## 1. Headline numbers

| Metric | Value |
| --- | --- |
| Mutants generated | 1135 |
| Killed | 174 |
| **Survived** | **230** |
| No coverage | 731 |
| Timeout | 0 |
| Errors | 0 |
| **Total mutation score** | **15.33%** |
| **Covered mutation score** | **43.07%** |

### Why two scores, and why the gap matters

- **Total score (15.33%)** = killed / all mutants. It counts every *no-coverage*
  mutant as unkilled. It answers: "how much of this code is protected by tests at all?"
- **Covered score (43.07%)** = killed / (killed + survived). It ignores code no test
  executes and judges only the code tests *do* reach. It answers: "when a test does run
  this line, does it actually assert anything about it?"

The 28-point gap separates two completely different problems:

- **731 of 1135 mutants (64%) are in code no test executes at all.** That is a coverage
  problem: whole functions and whole branches are unreached. Writing assertions cannot
  help; only new tests that call the code can.
- **230 survivors are in code tests *do* execute but fail to check.** That is an
  assertion-quality problem — the tests run the line, the line's behavior changes, and
  the suite stays green. These are the highest-signal findings in this document.

A reader who sees only "15.33%" concludes the test suite is worthless. A reader who sees
only "43.07%" concludes coverage is fine and assertions are soft. Both are wrong. Report
both numbers together, always.

---

## 2. Per-module results

| Module | Total % | Covered % | Killed | Survived | No coverage | src lines | test lines | test:src ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/store/scheduled-quests-store.ts` | **70.21** | 71.74 | 33 | 13 | 1 | 101 | 64 | 0.63 |
| `src/store/settings-store.ts` | 29.03 | 34.62 | 9 | 17 | 5 | 82 | 31 | 0.38 |
| `src/store/user-store.ts` | 25.93 | 30.43 | 7 | 16 | 4 | 60 | 35 | 0.58 |
| `src/lib/services/revenuecat-service.ts` | 18.25 | 50.00 | 48 | 48 | 167 | 389 | 165 | 0.42 |
| `src/lib/services/quest-timer.ts` | **10.04** | 36.15 | 77 | 136 | 554 | 1222 | 517 | 0.42 |

### Was `--inPlace` required?

**No.** Stryker's default sandbox mode (copying the project into `.stryker-tmp` and
mutating there) worked throughout the sweep. The React Native / Metro / Jest toolchain
did not need mutation-in-place to resolve modules. Nothing in the config sets
`inPlace: true`, and nothing should. Keep it that way — `--inPlace` mutates the working
tree, and an interrupted run leaves mutated source on disk.

### The prediction that failed

The five modules were picked by **test-to-source line ratio**, on the theory that the
modules with the thinnest test files would score worst.

That prediction was wrong, and it is worth stating plainly:

- `scheduled-quests-store.ts` had one of the *lowest* ratios (101 src / 64 test = 0.63)
  and scored **best by a wide margin — 70.21%**.
- `quest-timer.ts` and `revenuecat-service.ts` had *similar* ratios (0.42 each) and
  scored 10.04% and 18.25%.
- `settings-store.ts` and `user-store.ts` have ratios of 0.38 and 0.58 — essentially the
  same neighbourhood as `scheduled-quests-store.ts` — and scored 29% and 26%.

Ratio explains almost nothing. What actually separated the modules:

- `scheduled-quests-store.test.ts` asserts **resulting state** (`myRegistrations` ids,
  lengths, the settled payload). Its 64 lines buy real detection.
- `quest-timer.test.ts` is 517 lines that largely assert **that a call happened**
  (`expect(updatePhoneLockStatus).toHaveBeenCalledWith(...)`) or, worse, that **nothing
  threw** (`await expect(QuestTimer.onPhoneUnlocked()).resolves.not.toThrow()`). Length
  without outcome assertions buys nothing.

This is the entire argument for mutation testing over line counts or line coverage:
**the only measurement that distinguishes these two files is whether changing the code
makes a test go red.** Nothing derivable from file size, coverage %, or test count
would have ranked `scheduled-quests-store.ts` first.

---

## 3. What has no tests at all (the 731)

These are **not** enumerated individually — 731 entries would be unusable. They are
mapped to the regions they fall in. Each region below is code that **no test in the
suite executes**.

### `src/lib/services/quest-timer.ts` — 554 no-coverage mutants (76% of the file's mutants)

The class is ~1222 lines and the tests reach roughly the first 400. Untested regions,
by what lives there:

| Lines | Region | What is untested |
| --- | --- | --- |
| 40–42 | `parseIntSafe` body | The actual `parseInt` / `NaN` path — no test ever restores a start time from storage |
| 73–75, 81–83 | `saveQuestData` else-branches | `removeItem('ONESIGNAL_ACTIVITY_ID')` / `removeItem('QUEST_RUN_ID')` when the ids are null |
| 122–129, 139–140 | `loadQuestData` / `clearQuestData` catch blocks | Storage-failure handling |
| 216–241 | `prepareQuest` cooperative-run-data block | `setCooperativeQuestRun(...)` — participant normalisation, host id, questId fallback chain |
| 281–303 | `prepareQuest` iOS Live Activity catch + H2 registration failure path | |
| 404–532 | `onPhoneLocked` cooperative branch | The whole retry ladder (`sendPhoneLockStatus`, `maxRetries`, `retryDelay`) and the activation-polling loop |
| 559–564 | The 500 ms `setTimeout` body in `onPhoneLocked` | **`questStore.startQuest(quest)` — the line that actually starts a solo quest — never executes in any test.** Fake timers are never advanced. |
| 577–590 | Android `BackgroundService.updateNotification` | |
| 616–1196 | Everything from mid-`onPhoneUnlocked` to the end of `backgroundTask` | Quest failure on unlock, cooperative unlock handling, completion detection, the background loop, elapsed-time math, notification scheduling, `isRunning`, `getQuestRunId` |

The practical summary: **quest-timer is tested up to the point where the phone locks,
and not one line past it.** Everything about a quest completing, failing, or ticking is
unexecuted by the suite.

### `src/lib/services/revenuecat-service.ts` — 167 no-coverage mutants

| Lines | Region | What is untested |
| --- | --- | --- |
| 29–32 | `enableTestMode` | |
| 52–53 | Android `Purchases.configure` branch | The Google API key is never selected in a test |
| 58–60, 70–71, 80–81, 87–88 | catch/throw paths of `initialize`, `loginUser`, `logoutUser`, `refreshCustomerInfo` | |
| 95–103 | `refreshCustomerInfo` "No active account" recovery | The synthesised empty `CustomerInfo` fallback |
| 150–198 | The real body of `hasPremiumAccess` | **Blocked by the `if (__DEV__) return true` short-circuit at L138** — under Jest `__DEV__` is true, so no test can ever reach the entitlement check |
| 202–207 | `getOfferings` | |
| 256–268, 286–326 | `presentPaywall` guards + `ERROR` / `NOT_PRESENTED` switch arms | |
| 331–382 | Remaining public surface (customer-info getters / helpers at the end of the file) | |

### The three stores — 10 no-coverage mutants total

- `settings-store.ts` 52–56, 72–74: the bodies of `setDailyReminder`, `setStreakWarning`,
  `setHasBeenPromptedForReminder`, and the rehydration error handler. **Three of the
  store's six setters are never called by any test.**
- `user-store.ts` 26, 39–40: `removeItemForStorage`, and the `updateUser` merge body
  (`state.user ? { ...state.user, ...userData } : null`) — `updateUser` is never invoked.
- `scheduled-quests-store.ts` 50: `removeItemForStorage`. That is the *only* unreached
  line in the module, which is why it scored 70%.

---

## 4. Triage of the 230 survivors

Every surviving mutant is in exactly one bucket. Arithmetic first, so the counts can be
checked:

| Module | Survivors | Real gap | Equivalent | Don't care |
| --- | ---: | ---: | ---: | ---: |
| `quest-timer.ts` | 136 | 100 | 5 | 31 |
| `revenuecat-service.ts` | 48 | 32 | 0 | 16 |
| `scheduled-quests-store.ts` | 13 | 13 | 0 | 0 |
| `settings-store.ts` | 17 | 13 | 0 | 4 |
| `user-store.ts` | 16 | 8 | 0 | 8 |
| **Total** | **230** | **166** | **5** | **59** |

**166 + 5 + 59 = 230.** ✓ (Per-module: 136 + 48 + 13 + 17 + 16 = 230. ✓)

### Classification rules used

So the next reader can check the judgement rather than trust it:

1. **Real gap** — a test could kill this mutant, and the behavior it changes is
   behavior a user or an operator would notice. Default bucket.
2. **Equivalent** — the mutant is semantically identical to the original *for every
   input the declared types permit*, so no test can ever kill it. Each one below carries
   a one-line proof. "Hard to test" is never a reason to land here; only 5 of 230
   qualified.
3. **Don't care** — the mutated expression's entire observable effect is a
   `console.log` / `console.error` message, or a `__DEV__`-only affordance that is not
   part of a shipped build. These are real behavior changes, but asserting on log
   strings is worse than not asserting at all. Where a "don't care" cluster suggests the
   code should be deleted rather than tested, that is noted.

Note on the `__DEV__` rule: mutants inside a `__DEV__` body (dev log level, test-mode
simulation) are *don't care*. Mutants on a `__DEV__` **guard** that changes what
production returns are *real gap* — see `revenuecat-service.ts:138`.

---

### 4.1 `src/store/settings-store.ts` — 17 survivors (13 real gap, 0 equivalent, 4 don't care)

Existing test: `src/store/settings-store.test.ts` (31 lines) covers only `narratorVoice`
and `onboardingSoundEnabled`. Every other field is untouched.

#### Real gap (13)

| Line | Mutation | What breaks unnoticed | What a test must assert to kill it |
| --- | --- | --- | --- |
| 36 | `getItemForStorage` body → `{}` | Persisted settings never load; store always starts at defaults | With `getItem` mocked to return a JSON blob, assert the rehydrated store has the persisted values |
| 38 | `value ?? null` → `value && null` | Same: a stored value is discarded and read back as `null` | Same test as L36 — it must use a **non-empty** stored value |
| 44 | `dailyReminder: {enabled:false,time:null}` → `{}` | Default reminder object loses both fields | `expect(getState().dailyReminder).toEqual({ enabled: false, time: null })` |
| 45 | `enabled: false` → `true` | **Daily reminders default to ON**, scheduling notifications for users who never opted in | Assert `dailyReminder.enabled === false` on a fresh store |
| **48** | `streakWarning: {...}` → `{}` | Streak-warning default loses `enabled` *and* `time` | `expect(getState().streakWarning).toEqual({ enabled: true, time: { hour: 18, minute: 0 } })` |
| **49** | `enabled: true` → `false` | Streak warnings default OFF — the feature silently stops shipping to new users | Assert `streakWarning.enabled === true` on a fresh store |
| **50** | `time: {hour:18,minute:0}` → `{}` | The 18:00 send time disappears | Assert the exact `{ hour: 18, minute: 0 }` object |
| 52 | `setDailyReminder` → `() => undefined` | Setter is a no-op; the user's reminder choice is silently dropped | Call `setDailyReminder({enabled:true,time:{hour:7,minute:30}})`, assert the state changed |
| 53 | `setStreakWarning` → `() => undefined` | Setter is a no-op | Call `setStreakWarning(...)`, assert the state changed |
| 54 | `hasBeenPromptedForReminder: false` → `true` | The reminder prompt is suppressed for every new user — the prompt never shows | Assert it defaults to `false` |
| 55 | `setHasBeenPromptedForReminder` → `() => undefined` | The "already prompted" flag never sets → prompt can re-fire | Call it with `true`, assert the state changed |
| 63 | persist options object → `{}` | No storage name, no storage adapter — settings stop persisting entirely | Assert `setItem` is called with key `'unquest-settings'` after a mutation |
| 64 | `name: 'unquest-settings'` → `""` | **Storage key changes → every existing user's settings are orphaned on upgrade** | Same assertion as L63; pin the literal key |

> **Calibration note (required by the task brief).** Lines 48–51 —
> `streakWarning: { enabled: true, time: { hour: 18, minute: 0 } }` — are **Real gap**,
> not "don't care". That hardcoded 18:00 is a known live user-facing problem (a fixed
> evening send time that fires while evening questers are mid-quest; see the streak
> warning investigation, server issue #73). A default that encodes a product decision
> with an open bug against it is exactly the kind of value a test must pin, so that
> changing it is a deliberate, visible act.

#### Don't care (4)

| Line | Mutation | Why |
| --- | --- | --- |
| 70 | `onRehydrateStorage` body → `{}` | Whole handler's only effect is a `console.error` |
| 71 | inner callback body → `{}` | Same |
| 72 | `if (error)` → `true` / `false` (2 mutants) | Only decides whether a `console.error` prints |

Worth noting rather than testing: this rehydration handler **swallows hydration errors**
after logging them. If settings hydration is ever expected to fail recoverably, that
deserves real handling, not a test on the log line.

---

### 4.2 `src/store/user-store.ts` — 16 survivors (8 real gap, 0 equivalent, 8 don't care)

Existing test: `src/store/user-store.test.ts` (35 lines) asserts only the **Sentry**
side effects of `setUser` / `clearUser`. It never checks that the store itself changed.
That single omission accounts for most of this list.

#### Real gap (8)

| Line | Mutation | What breaks unnoticed | What a test must assert to kill it |
| --- | --- | --- | --- |
| 17 | `getItemForStorage` body → `{}` | Persisted user never rehydrates → user appears logged out after restart | Mock `getItem` to return a serialised user; assert the store rehydrates it |
| 19 | `value ?? null` → `value && null` | Same, via a discarded value | Same test, with a non-empty stored value |
| 22 | `setItemForStorage` body → `{}` | **The user is never written to storage** — nothing persists across launches | After `setUser(...)`, assert `setItem` was called with `'user-storage'` and a payload containing the id |
| **36** | `set({ user })` → `set({})` | **`setUser` reports to Sentry but never stores the user.** The existing test passes because it only checks Sentry | `useUserStore.getState().setUser(u); expect(getState().user).toEqual(u)` |
| 38 | `updateUser` arrow → `() => undefined` | `updateUser` is a silent no-op; profile/feature-flag updates never land | Seed a user, call `updateUser({ email: 'x' })`, assert the merged result — and assert `updateUser` on a null user leaves it null |
| **44** | `set({ user: null })` → `set({})` | **`clearUser` clears the Sentry user but leaves the user in the store** — logout / account-wipe leaves stale identity behind | `setUser(u); clearUser(); expect(getState().user).toBeNull()` |
| 47 | persist options → `{}` | User state stops persisting entirely | Assert `setItem` called with `'user-storage'` |
| 48 | `name: 'user-storage'` → `""` | **Storage key changes → every existing user is logged out on upgrade** | Pin the literal key in the same assertion |

L36 and L44 are the highest-value findings in this module: two of the app's most
consequential state transitions (sign-in and wipe) are covered by tests that check the
observability side effect and not the state change.

#### Don't care (8)

| Lines | Mutation | Why |
| --- | --- | --- |
| 54 | `onRehydrateStorage` body → `{}`; arrow → `() => undefined` (2) | Handler's only effect is two `console.log`s |
| 55 | `'[UserStore] Rehydrated with user:'` → `""`; `state?.user?.id` → `state.user.id` / `state?.user.id` (3) | Console-log arguments |
| 56 | `'[UserStore] Feature flags:'` → `""`; `state?.user?.featureFlags` → non-optional (3) | Console-log arguments |

These eight should be **deleted, not tested**. They log a user id to the console on every
launch (a small PII-in-logs smell) and their only failure mode — the optional-chaining
mutants throwing when `state` is `undefined` after a failed hydration — exists solely
because the log exists.

---

### 4.3 `src/store/scheduled-quests-store.ts` — 13 survivors (13 real gap, 0 equivalent, 0 don't care)

The best-scoring module (70.21%), and the one whose remaining gaps are the most
mechanical to close. The recurring cause: **every test operates on a one-element
array**, where several distinct implementations are indistinguishable.

| Line | Mutation | What breaks unnoticed | What a test must assert to kill it |
| --- | --- | --- | --- |
| 36 | `myRegistrations: []` → `["Stryker was here"]` | The initial/reset registration list is not empty | After `reset()`, `expect(getState().myRegistrations).toEqual([])` |
| 41 | `getItemForStorage` body → `{}` | Registrations never rehydrate | Mock `getItem`, assert rehydrated registrations |
| 43 | `value ?? null` → `value && null` | Same | Same test with a non-empty stored value |
| 46 | `setItemForStorage` body → `{}` | Registrations never persist | Assert `setItem` called with `'scheduled-quests-storage'` after a mutation |
| 63 | `.some(...)` → `.every(...)` | With **2+** registrations, upserting an existing one appends a duplicate instead of replacing it | Seed `[a, b]`, upsert an updated `b`, assert length 2 and no duplicate id |
| 64 | inner ternary `r.id === run.id` → `true` | With **2+** registrations, upserting one **overwrites all of them** with the incoming run | Seed `[a, b]`, upsert updated `a`, assert `b` is untouched |
| 82 | filter predicate → `() => undefined` | `recordSettlement` drops **every** registration, not just the settled one | Seed `[a, b]`, settle `a`, assert `b` survives |
| 82 | filter predicate → `false` | Same as above | Same test |
| 86 | `reset: () => set(initialState)` → `() => undefined` | `reset()` is a no-op — stale registrations survive logout/wipe | Populate the store, call `reset()`, assert both `myRegistrations` and `settlements` are empty |
| 88 | persist options → `{}` | Nothing persists | Assert `setItem` called with `'scheduled-quests-storage'` |
| 89 | `name: 'scheduled-quests-storage'` → `""` | Storage key change orphans persisted registrations | Pin the literal key |
| 95 | `partialize` return → `{}` | Nothing is written to storage despite persist being configured | Assert the persisted payload contains `myRegistrations` and `settlements` |
| 95 | `partialize` arrow → `() => undefined` | Same | Same |

Why the existing tests miss these: `upserts a registration without duplicating` seeds
`[a]`, upserts `a`, then upserts `b`. On a one-element array `.some` and `.every` agree,
and the `.map` ternary has only one element to choose between — so three different
implementations all produce the same result. **Adding a second element to that fixture
kills L63 and L64 at once.** Likewise `records settlements by questRunId` seeds a single
registration and asserts the list is empty afterwards — which an implementation that
deletes everything also satisfies.

---

### 4.4 `src/lib/services/revenuecat-service.ts` — 48 survivors (32 real gap, 0 equivalent, 16 don't care)

Existing test: `src/lib/services/revenuecat-service.test.ts` (165 lines). It is an
**analytics test**, not a service test: every assertion is
`expect(posthogClient.capture).toHaveBeenCalledWith(...)`. It never asserts a return
value, never asserts `Purchases.*` was called with the right arguments, and never
asserts internal state (`isInitialized`, `customerInfo`). That shape explains the whole
list below.

#### Real gap (32)

Grouped by the behavior that goes unchecked.

**A. Initialization and the singleton — 10 mutants (L15, L22, L37 ×2, L50 ×5, L51)**

| Line | Mutation | What breaks unnoticed | Test that kills it |
| --- | --- | --- | --- |
| 15 | `private isInitialized = false` → `true` | The service claims to be initialized before `initialize()` runs, so the `refreshCustomerInfo` / `presentPaywall` guards never fire | Assert `refreshCustomerInfo()` rejects with `'RevenueCat not initialized'` before `initialize()` |
| 22 | `if (!RevenueCatService.instance)` → `true` | `getInstance()` returns a **new instance every call** — the singleton is broken and `isInitialized` resets per caller | `expect(RevenueCatService.getInstance()).toBe(RevenueCatService.getInstance())` |
| 37 | guard block → `{}` (drops the `return`) | `initialize()` is no longer idempotent — re-configures the SDK on every call | Call `initialize()` twice; assert `Purchases.configure` called exactly once |
| 37 | `if (this.isInitialized)` → `false` | Same | Same |
| 50 | `if (Platform.OS === 'ios')` → `true` / `false` (2) | The iOS branch is taken on Android, or never taken at all | With `Platform.OS = 'ios'`, assert `Purchases.configure` called with `{ apiKey: Env.REVENUECAT_APPLE_API_KEY }`; repeat for `'android'` and the Google key |
| 50 | `===` → `!==` | iOS gets the Google key and vice-versa | Same |
| 50 | `'ios'` → `""` | **Neither branch matches → `Purchases.configure` is never called and IAP is dead on both platforms** | Same |
| 50 | if-block → `{}` | iOS never configures | Same |
| 51 | `{ apiKey: Env.REVENUECAT_APPLE_API_KEY }` → `{}` | RevenueCat configured with **no API key** | Same — assert the exact object |

The L50/L51 cluster is the most consequential in this module: every one of these ships a
build where purchases silently do not work, and nothing in CI notices.

**B. Login / logout / customer-info refresh — 7 mutants (L65, L66, L76, L77, L86, L87, L91)**

| Line | Mutation | What breaks unnoticed | Test that kills it |
| --- | --- | --- | --- |
| 65, 66 | `loginUser` body / `try` block → `{}` (2) | `loginUser` is a no-op: `Purchases.logIn` never called, `this.customerInfo` never set — entitlements stay attached to the anonymous id | `await loginUser('u1')`; assert `Purchases.logIn` called with `'u1'` |
| 76, 77 | `logoutUser` body / `try` block → `{}` (2) | `Purchases.logOut` never called — the previous user's entitlements persist into the next session | `await logoutUser()`; assert `Purchases.logOut` called |
| 86 | `refreshCustomerInfo` body → `{}` | Returns `undefined` instead of `CustomerInfo`; every caller silently sees no entitlements | `await expect(refreshCustomerInfo()).resolves.toEqual(mockInfo)` |
| 87 | `if (!this.isInitialized) throw` → `false` | The "not initialized" guard never fires; calls proceed against an unconfigured SDK | Assert the rejection before `initialize()` (same test as L15) |
| 91 | `try` block → `{}` | Returns `undefined` and never caches `customerInfo` | Same as L86, plus assert a second call reuses/refreshes as intended |

**C. `hasPremiumAccess` — 10 mutants (L130, L138 ×3, L140, L144 ×4, L146)**

`hasPremiumAccess` has **no test at all**, and its first statement is
`if (__DEV__) return true`. Under Jest `__DEV__` is `true`, so even an incidental call
would return early and never reach the entitlement logic (which is why L150–198 is
no-coverage).

| Line | Mutation | What breaks unnoticed | Test that kills it |
| --- | --- | --- | --- |
| 130 | method body → `{}` | `hasPremiumAccess()` resolves `undefined` — every premium gate reads falsy | Any assertion on the return value |
| 138 | `if (__DEV__)` → `true` | **Premium granted to every user in production** | Stub `global.__DEV__ = false` and assert the entitlement path is consulted |
| 138 | `if (__DEV__)` → `false`; block → `{}` (2) | The dev override disappears | With `__DEV__ = true`, assert it resolves `true` without touching `Purchases` |
| 140 | `return true` → `false` | Dev builds lose premium; more importantly the return value is unasserted anywhere | Same |
| 144 | `if (!this.isInitialized)` → `this.isInitialized` / `true` / `false`; block → `{}` (4) | The uninitialized short-circuit inverts — an unconfigured SDK reports premium, or a configured one reports none | With `__DEV__ = false` and no `initialize()`, assert it resolves `false` |
| 146 | `return false` → `true` | **Uninitialized SDK reports the user as premium** | Same |

Note the structural finding: the `__DEV__` override at L138 makes the entire real
entitlement path untestable *by construction*. Any test worth writing here must first
control `__DEV__`.

**D. Purchase / restore / paywall error paths and return values — 5 mutants (L227, L234, L258, L285, L299)**

| Line | Mutation | What breaks unnoticed | Test that kills it |
| --- | --- | --- | --- |
| 227 | `error?.userCancelled` → `error.userCancelled` | A rejection with a nullish value throws a `TypeError` out of the catch block, masking the real failure | `mockRejectedValue(undefined)`; assert `purchase_failed` is still captured and the original rejection propagates |
| 234 | `error?.code` → `error.code` | Same, in the `purchase_failed` payload | Same |
| 258 | `if (!this.isInitialized)` → `false` | `presentPaywall` proceeds on an unconfigured SDK instead of returning `false` | Assert `presentPaywall()` resolves `false` and never calls `RevenueCatUI.presentPaywall` before `initialize()` |
| 285 | `return true` (PURCHASED arm) → `false` | **A successful purchase reports failure to the caller**, so the UI never unlocks premium | `await expect(presentPaywall('settings')).resolves.toBe(true)` |
| 299 | `return false` (CANCELLED arm) → `true` | **A cancelled paywall reports success**, unlocking premium for free | `await expect(presentPaywall('settings')).resolves.toBe(false)` |

L285 and L299 are one-line fixes to the two existing paywall tests: those tests already
drive the PURCHASED and CANCELLED paths and simply throw the return value away.

#### Don't care (16)

| Lines | Mutation | Why |
| --- | --- | --- |
| 38, 57, 69, 79, 237, 251, 275, 298 | `console.log` / `console.error` message strings → `""` (8) | Log text only |
| 131 (×2) | `'[RevenueCat] Checking premium access...'` → `""`; its payload object → `{}` (2) | Log arguments only |
| 139, 145 | Dev/uninitialized log strings → `""` (2) | Log text only |
| 44 (×3) | `if (__DEV__) Purchases.setLogLevel(VERBOSE)` → `true` / `false` / `{}` | Sets SDK log verbosity in dev builds only; no shipped behavior |
| 264 | `if (this.testModeEnabled && __DEV__)` → `false` | Disables a `__DEV__`-only purchase simulation shortcut; `testModeEnabled` can only be set by `enableTestMode()`, which is itself `__DEV__`-gated |

---

### 4.5 `src/lib/services/quest-timer.ts` — 136 survivors (100 real gap, 5 equivalent, 31 don't care)

Existing test: `src/lib/services/quest-timer.test.ts` (517 lines, 13 tests). The two
patterns that produce nearly all 136 survivors:

1. **Assert-the-call, ignore-the-payload.** e.g. the H1 test asserts
   `OneSignal.LiveActivities.startDefault` was called and checks only the *id* argument —
   so every mutation of the attributes/content objects survives.
2. **Assert-nothing-threw.** Both `onPhoneUnlocked` tests are literally
   `await expect(QuestTimer.onPhoneUnlocked()).resolves.not.toThrow()`, with a comment
   saying "the test passes if no errors are thrown". An **empty method body also does not
   throw**, which is exactly why `L600 BlockStatement → {}` survives. The test named
   *"marks quest as failed locally when phone is unlocked during quest"* asserts nothing
   about failing a quest.

#### Real gap (100), by region

**A. Storage helpers — 2 mutants**

| Line | Mutation | Consequence | Test that kills it |
| --- | --- | --- | --- |
| 39 | `parseIntSafe` body → `{}` | Returns `undefined` instead of a parsed start time | Export the helper (or drive it via `loadQuestData`) and assert a stored `'1700000000000'` round-trips to a number |
| 40 | `if (value && typeof value === 'string')` → `false` | **`parseIntSafe` always returns `null` → a restored quest has no start time and is treated as never started** | Mock `getItem('QUEST_TIMER_START_TIME')` to a numeric string, call `loadQuestData` via `onPhoneLocked`, assert the restored start time is used |

**B. `saveQuestData` (L61–88) — 11 mutants**

No test asserts what gets written to MMKV. All of these silently break quest restoration
after an app kill.

| Line | Mutation | Consequence |
| --- | --- | --- |
| 62 | `if (this.questTemplate)` → `true` | Persists `"null"` as the template when there is no quest |
| 66 | `if (this.questStartTime)` → `false`; block → `{}` (2) | Start time never persisted → restored quest restarts from zero |
| 67 | `'QUEST_TIMER_START_TIME'` → `""` | Start time written to the wrong key → lost |
| 71 | `if (this.oneSignalActivityId)` → `true` / `false`; block → `{}` (3) | Activity id written when null / never written → the Live Activity card cannot be dismissed |
| 72 | `'ONESIGNAL_ACTIVITY_ID'` → `""` | Activity id lost |
| 79 | `if (this.questRunId)` → `true` | Writes a null run id |
| 81 | else-block → `{}` | Stale `QUEST_RUN_ID` is never removed → a new quest can attach to a dead run |
| 82 | `'QUEST_RUN_ID'` → `""` | Run id lost |

**Test that kills the cluster:** after `prepareQuest(...)` + `onPhoneLocked()`, assert
`setItem` was called with each of `'QUEST_TIMER_TEMPLATE'`, `'QUEST_TIMER_START_TIME'`,
`'ONESIGNAL_ACTIVITY_ID'`, `'QUEST_RUN_ID'` and the expected values; and in a second case
with a null activity id, assert `removeItem('ONESIGNAL_ACTIVITY_ID')`. (`stopQuest`
already has the mirror-image assertions on `removeItem` — copy that style.)

**C. `loadQuestData` (L91–131) — 15 mutants**

| Line | Mutation | Consequence |
| --- | --- | --- |
| 91, 92 | method body / `try` block → `{}` (2) | **Restoration is a complete no-op** — a quest never survives an app restart |
| 94, 100, 104 | storage keys `'QUEST_TIMER_TEMPLATE'` / `'QUEST_TIMER_START_TIME'` / `'ONESIGNAL_ACTIVITY_ID'` → `""` (3) | Reads the wrong key → nothing restores |
| 95 | `if (templateJson)` → `true` / `false`; block → `{}` (3) | Template never restored, or `parseJson(null)` nulls it out |
| 118 | `if (this.oneSignalActivityId)` → `true` / `false`; block → `{}` (3) | The restored activity id is never pushed into the quest store → the UI loses the Live Activity handle |
| 120 | `if (typeof store.setLiveActivityId === 'function')` → `false`; `!==`; `'function'` → `""`; block → `{}` (4) | `setLiveActivityId` is never called on restore |

**Test that kills the cluster:** seed `getItem` with all four keys, invoke restoration,
then assert (a) the template/start-time/run-id are restored, and (b)
`useQuestStore.getState().setLiveActivityId` was called with the stored activity id.

**D. `prepareQuest` — 27 mutants**

| Line | Mutation | Consequence | Test that kills it |
| --- | --- | --- | --- |
| 160 | `if (notificationsEnabled)` → `true` / `false`; block → `{}` (3) | `clearAllNotifications()` is called when notifications are disabled, or never called — stale quest notifications survive into the new quest | Mock `areNotificationsEnabled` both ways; assert `clearAllNotifications` called / not called |
| 181 | `&&` → `\|\|` | **Every `mode: 'custom'` quest throws "Cooperative quest must have an existing quest run ID"** — custom quests stop working entirely | `prepareQuest({ mode: 'custom', category: 'fitness', ... })` must resolve and call `createQuestRun` |
| 181 | `mode === 'custom'` → `true` / `!==`; `'custom'` → `""` (4) | The custom+cooperative discriminator misfires: a cooperative custom quest silently creates a solo run, or a solo one throws | `prepareQuest({ mode:'custom', category:'cooperative' })` **must throw**; `{ mode:'custom', category:'fitness' }` **must not** |
| 216 | `if (questRun.invitationId && questRun.participants)` → `\|\|` / `true` / `false` (3) | Cooperative run data is written to the store for a solo run, or never written for a coop run | Have `createQuestRun` resolve with and without `invitationId`/`participants`; assert `setCooperativeQuestRun` called exactly in the coop case |
| 264 | pending `attributes` object → `{}` | Live Activity card starts with **no title/description** | Assert the 2nd argument of `startDefault` equals `{ title: 'Quest Ready', description: 'Lock your phone to begin your quest' }` |
| 268 | pending `pendingContent` object → `{}` | Card starts with no duration and no status | Assert the 3rd argument equals `{ durationMinutes, status: 'pending' }` |
| 270 | `status: 'pending'` → `""` | **The card renders in the wrong state** (this is the same class of defect as the historical "QUEST COMPLETE" Live Activity bug) | Same assertion |
| 278 | `if (typeof store.setLiveActivityId === 'function')` → `false`; `!==`; `'function'` → `""`; block → `{}` (4) | The freshly minted activity id never reaches the quest store | Assert `setLiveActivityId` called with the same id passed to `startDefault` |
| 294 | `Platform.OS === 'ios'` → `true` | On Android, `prepareQuest` calls `updatePhoneLockStatus` for a live activity that does not exist | With `Platform.OS = 'android'`, assert `updatePhoneLockStatus` is **not** called during prepare |
| 316 | `taskIcon: { name, type }` → `{}` | `BackgroundService.start` gets no icon — Android foreground service fails to start | Assert the options object passed to `BackgroundService.start` |
| 317, 318 | `'ic_launcher'` / `'mipmap'` → `""` (2) | Same | Same |
| 321 | `foregroundServiceType: ['specialUse']` → `[]` | **Android 14+ rejects a foreground service with no declared type** — the background timer dies on modern Android | Same |
| 331 | `('recap' in t ? t.recap : t.title) \|\| 'Focus...'` → `true` / `false` / `&&`; `'recap'` → `""` (4) | The Android persistent notification shows the wrong (or empty) quest description | Assert `options.parameters.questDescription` for a template with `recap` and one without |

**E. `onPhoneLocked` — 34 mutants**

| Line | Mutation | Consequence | Test that kills it |
| --- | --- | --- | --- |
| 350 | duplicate-lock guard block → `{}` (drops the `return`); `if (this.isPhoneLocked)` → `false` (2) | Duplicate lock events fall through and re-run the whole start sequence | The existing *"should handle duplicate phone lock calls"* test is vacuous — it only asserts `updatePhoneLockStatus` was not called, which a second guard at L358 already prevents. Rewrite it: prepare a quest, lock, lock again, assert `startDefault` / `updatePhoneLockStatus` / `saveQuestData` side effects happened **exactly once** |
| 355 | `this.isPhoneLocked = true` → `false` | The lock flag never sets, so the 500 ms starter at L559 bails and the quest never starts | Assert the solo quest starts after the timer runs (see G below) |
| 358 | `if (this.questTemplate && !this.questStartTime)` → `true`; `&&` → `\|\|` (2) | Lock handling runs with no template, or **re-stamps `questStartTime` on an already-running quest** (resetting elapsed time to zero) | Lock twice with `isPhoneLocked` reset in between; assert `questStartTime` did not change |
| 362 | `if (Platform.OS === 'ios')` → `true` / `false` / `!==`; `'ios'` → `""`; block → `{}` (5) | The Live Activity update on lock is skipped, or attempted on Android | Assert `startDefault` is called on iOS and not on Android |
| 364 | `this.oneSignalActivityId \|\| uuidv4()` → `&&` | A **new** activity id is minted on lock instead of reusing the prepare-time id — the server's stale-activity sweep then dismisses the live card (this is the H1 defect class) | Assert the id used at lock equals the id minted at prepare |
| 366 | active `attributes` object → `{}` | Live Activity loses title/description at quest start | Assert the 2nd argument of the lock-time `startDefault` |
| 369 | `'description' in this.questTemplate` → `""` | Always falls back to `'Focus on your quest'`, discarding the quest's own description | Assert the description for a template that has one |
| 371 | `'Focus on your quest'` → `""` | Empty description for templates without one | Assert the fallback |
| 373 | `updatedContent` object → `{}` | Card has no duration/status at start | Assert the 3rd argument |
| 375 | `status: 'active'` → `""` | **Card never flips from pending to active** — the visible symptom users report as a stuck card | Assert `status: 'active'` |
| 395 | `cooperativeQuestRun && cooperativeQuestRun.id === this.questRunId` → `true` / `false` (2) | Solo quests are treated as cooperative (so they never start) or coop quests as solo (so they double-start) | Two tests: solo lock ⇒ `startQuest` called; coop lock ⇒ `startQuest` **not** called and the coop path taken |
| 397 | `if (this.questRunId)` → `true` | Server lock-status call attempted with a null run id | Prepare with a failed `createQuestRun`, lock, assert `updatePhoneLockStatus` not called |
| 398 | `if (isCooperativeQuest)` → `true` / `false` (2) | Coop quests use the solo endpoint and vice-versa | Same two tests as L395 |
| 556 | `if (!isCooperativeQuest)` → `isCooperativeQuest` / `true` / `false`; block → `{}` (4) | **The solo quest never starts** (or a coop quest double-starts) | See L557 |
| 557 | `setTimeout` callback body → `{}` | `questStore.startQuest(...)` never runs | `jest.useFakeTimers()`, lock, `jest.advanceTimersByTime(500)`, assert `startQuest` called with `{ ...template, startTime, status: 'active' }` |
| 559 | `if (this.isPhoneLocked)` → `true` / `false` (2) | A quest starts even though the user unlocked within the 500 ms window, or never starts at all | Lock, unlock before advancing timers, advance, assert `startQuest` **not** called |
| 577 | `Platform.OS === 'android' && BackgroundService.isRunning()` → `true` / `false` / `\|\|`; `=== 'android'` → `true` / `!==`; `'android'` → `""` (6) | `updateNotification` is called when no service is running (throws) or never called (the Android notification stays on "Lock your phone to begin") | With `Platform.OS='android'` and `isRunning()` true, assert `updateNotification` called with the in-progress title; with `isRunning()` false, assert not called |

**F. `onPhoneUnlocked` — 10 mutants**

| Line | Mutation | Consequence | Test that kills it |
| --- | --- | --- | --- |
| 600 | **whole method body → `{}`** | **Unlocking the phone does nothing at all — the quest is never failed.** Both existing tests still pass because they only assert the promise does not reject | Prepare + lock a quest, unlock, assert the quest store recorded a failure (and that `isPhoneLocked` is false) |
| 602 | `this.isPhoneLocked = false` → `true` | The lock flag stays true after unlock; the next lock event is swallowed by the L350 guard and the 500 ms starter can fire for a quest the user abandoned | Unlock, then lock again, assert the second lock is processed |
| 607 | `!this.questRunId \|\| !this.questStartTime \|\| !this.questTemplate` → `true` / `false`; sub-condition → `false`; `\|\|` → `&&` (×2); `!this.questRunId` → `this.questRunId`; `!this.questStartTime` → `this.questStartTime`; block → `{}` (8) | The early return inverts: either **every** unlock is ignored (quests never fail) or an unlock with no active quest proceeds into the failure path | Two tests: (a) unlock with no prepared quest ⇒ no store writes, no server calls; (b) unlock mid-quest ⇒ the failure path runs |

**G. `stopQuest` — 1 mutant**

| Line | Mutation | Consequence | Test that kills it |
| --- | --- | --- | --- |
| 1201 | `if (BackgroundService.isRunning())` → `true` | `BackgroundService.stop()` is called when no service is running | With `isRunning()` mocked false, assert `stop` is **not** called (the existing Android test only covers the `true` case) |

#### Equivalent (5)

Each of these is unkillable, with the proof:

| Line | Mutation | Why no test can kill it |
| --- | --- | --- |
| 27 | sub-condition `typeof jsonString === 'string'` → `true` | Given the declared type, `jsonString && typeof jsonString === 'string'` is exactly `Boolean(jsonString)`. The `typeof` operand can only ever be redundant. |
| 40 | `if (value && typeof value === 'string')` → `true` | `parseInt(null)` / `parseInt(undefined)` / `parseInt('')` all yield `NaN`, and the `!isNaN` check then returns `null` — identical to the original for every permitted input. |
| 40 | `&&` → `\|\|` | Only `''` differs, and it reaches the same `NaN → null` result. |
| 120 | `if (typeof store.setLiveActivityId === 'function')` → `true` | `useQuestStore` always defines `setLiveActivityId`, so the guard is always true. The `else` branch (a `console.warn`) is dead code. |
| 278 | same guard in `prepareQuest` → `true` | Same reason. |

> **Reclassified from Equivalent to Don't care (see §4.5 Don't care table below):** the
> full-condition mutant `if (jsonString && typeof jsonString === 'string')` → `true` at
> L27, and the `&&` → `\|\|` mutant at L27. Neither is strictly equivalent — for input
> `''` both mutants enter the `try` block, `JSON.parse('')` throws, and
> `console.error('Failed to parse JSON from storage:')` fires, which the original never
> does. The return value (`null`) is unchanged, so the only difference is a log line —
> exactly the "don't care" rule, not equivalence.

The one `L27` / two `L40` entries above also carry a design note: **the
`typeof x === 'string'` operand in both helpers is unreachable defensive code** given the
TypeScript signature. Deleting it is a better outcome than testing it.

#### Don't care (31)

| Lines | Mutation | Why |
| --- | --- | --- |
| 27 (×2) | `if (jsonString && typeof jsonString === 'string')` → `true`; `&&` → `\|\|` | For `''`, both mutants enter the `try` block where `JSON.parse('')` throws and `console.error('Failed to parse JSON from storage:')` fires; the return value (`null`) is unchanged — log-only difference, reclassified from Equivalent (see note above the Equivalent table) |
| 109 (×2), 110 (×2), 111 | `'[QuestTimer] Loaded quest data:'` → `""`, its payload object → `{}`, `!!this.questTemplate` flips, `this.questTemplate?.id` → non-optional | All inside one `console.log` |
| 149 (×2), 175, 188, 197, 199, 200, 210 | Log messages and log payload objects in `prepareQuest` | Log-only |
| 249, 250 | `catch` block of `createQuestRun` → `{}`; its message string → `""` | The catch body is a `console.error` plus a comment; the "continue anyway" behavior is the *absence* of a rethrow and is already covered |
| 320, 322, 325 | `color: '#77c5bf'` → `""`, `progressBar` object → `{}`, `indeterminate: true` → `false` | Cosmetics of the Android notification |
| 347, 351, 360, 378, 381, 388 | Log message strings in `onPhoneLocked` | Log-only |
| 539, 545 | Log message strings in the solo lock-status branch | Log-only |
| 601, 608 | `'Phone unlocked'`, `'No active quest found on unlock.'` | Log-only |
| 1200 | `'Stopping quest timer and background service.'` | Log-only |

---

## 5. Prioritized follow-up list

**No tests were written as part of this baseline.** This is the work list for the next
session, ordered by risk — the damage a real bug in that code would do, weighted by how
convincingly the current tests pretend to cover it. Start at #1.

Every item below is a **Real gap**. Nothing from the Equivalent or Don't-care buckets is
worth work; if anything, two clusters argue for *deleting* code instead of testing it:
the `user-store` rehydration `console.log`s (Don't care, §4.2) and the redundant
`typeof x === 'string'` operands in `quest-timer`'s two parse helpers (Equivalent, §4.5).

| # | Item | Why it ranks here |
| --- | --- | --- |
| 1 | **`quest-timer.ts` `onPhoneUnlocked` (L600, L602, L607 ×8)** — assert the quest is actually failed on unlock, and that an unlock with no active quest is a no-op. | The whole method body can be deleted and the suite stays green. A test named *"marks quest as failed locally when phone is unlocked during quest"* asserts only that nothing threw. Failing a quest on unlock is the app's core rule; it is currently unprotected **and** carries a test that claims otherwise. |
| 2 | **`quest-timer.ts` solo quest start (L556 ×4, L557, L559 ×2, L355, L395 ×2, L398 ×2)** — `jest.useFakeTimers()`, lock, advance 500 ms, assert `questStore.startQuest` is called with `status: 'active'`; and that unlocking inside the window cancels it. | `startQuest` — the line that makes a quest exist — is in the no-coverage set (L559–564). The solo/cooperative discriminator that routes into it is unasserted. If this breaks, the timer runs and nothing starts. |
| 3 | **`quest-timer.ts` `prepareQuest` mode discriminator (L181 ×5)** — a `mode:'custom'` quest with a non-cooperative category must prepare normally; `mode:'custom'` + `category:'cooperative'` must throw. | One operator flip (`&&` → `\|\|`) makes **every custom quest** throw "Cooperative quest must have an existing quest run ID". Custom quests are a shipped feature with zero tests through this branch. |
| 4 | **`revenuecat-service.ts` `initialize` platform keys (L50 ×5, L51, L37 ×2, L15, L22)** — assert `Purchases.configure` gets the Apple key on iOS and the Google key on Android, exactly once. | Six independent mutations here each ship a build where in-app purchases silently do not work. This is the only revenue path in the app and nothing in CI touches it. |
| 5 | **`revenuecat-service.ts` `presentPaywall` return values (L285, L299, L258)** — assert `resolves.toBe(true)` for PURCHASED and `toBe(false)` for CANCELLED. | Cheapest high-value fix in the document: the two existing paywall tests already drive both paths and discard the return value. Two added lines. A flipped return either unlocks premium for a cancelled paywall or fails to unlock a paid one. |
| 6 | **`user-store.ts` `setUser` / `clearUser` state (L36, L44, L38)** — assert the store contains the user after `setUser`, is `null` after `clearUser`, and that `updateUser` merges. | Both existing tests assert only the Sentry side effect. `set({ user })` can be replaced with `set({})` and they pass. Sign-in and account-wipe are exactly the transitions the provisional-auth work depends on. |
| 7 | **`quest-timer.ts` persistence round-trip (`saveQuestData` 11 + `loadQuestData` 15 = 26 mutants)** — assert the four MMKV keys are written with the right values, cleared when null, and read back on restore. | Every storage-key literal can be blanked without a test noticing. Symptom in production is a quest that vanishes when the OS kills the app — hard to reproduce, easy to prevent. |
| 8 | **`settings-store.ts` defaults and setters (L44, L45, L48–L50, L52–L55)** — pin `dailyReminder`, `streakWarning` (`enabled: true`, `{ hour: 18, minute: 0 }`), `hasBeenPromptedForReminder: false`, and assert each setter mutates state. | The 18:00 streak-warning default is a **known live user-facing problem** (fixed evening send time; server issue #73). Whatever it changes to, it must change deliberately — an untested default is a silent one. Three of six setters are also never invoked by any test. |
| 9 | **`scheduled-quests-store.ts` two-element fixtures (L63, L64, L82 ×2)** — seed `[a, b]` instead of `[a]` in the upsert and settlement tests. | Highest kills-per-keystroke in the sweep: changing one fixture from one element to two kills four survivors, because `.some`/`.every` and the map ternary are indistinguishable on a single-element array. |
| 10 | **`quest-timer.ts` Live Activity payloads (L264, L268, L270, L364, L366, L369, L371, L373, L375)** — assert the `attributes` and `content` arguments of both `startDefault` calls, not just the id. | Wrong Live Activity content is a defect class this project has already shipped once (the "QUEST COMPLETE" card). L364 in particular reintroduces the stale-id bug that H1 was written to fix — and the H1 test does not catch it. |
| 11 | **`quest-timer.ts` Android background service (L316, L317, L318, L321, L331 ×4, L577 ×6)** — assert the options passed to `BackgroundService.start`, and the `updateNotification` guard. | `foregroundServiceType: ['specialUse']` → `[]` kills the background timer on Android 14+. The existing Android test asserts only that `start` was called. |
| 12 | **`quest-timer.ts` restore-side store wiring (L118 ×3, L120 ×4, L278 ×4, L294)** — assert `setLiveActivityId` is called with the restored/minted id, and that prepare does not register a live activity on Android. | Loses the handle needed to dismiss the Live Activity card; platform leakage calls iOS-only APIs on Android. |
| 13 | **`revenuecat-service.ts` `hasPremiumAccess` (L130, L138 ×3, L140, L144 ×4, L146)** — stub `global.__DEV__ = false` and assert the real entitlement path; with `__DEV__ = true` assert the override. | The `if (__DEV__) return true` short-circuit makes 49 lines of entitlement logic unreachable by any test *by construction*. Ranked below #4 only because a mistake here is dev-visible sooner. |
| 14 | **`revenuecat-service.ts` session lifecycle (L65, L66, L76, L77, L86, L87, L91) and error null-safety (L227, L234)** — assert `Purchases.logIn`/`logOut` are called, that `refreshCustomerInfo` returns and caches, and that a nullish rejection does not throw out of the catch. | Entitlements attached to the wrong app-user id survive across accounts. Lower priority than #4 because failures here are visible in support reports rather than silent. |
| 15 | **Persist-key pinning across all three stores (`settings-store` L63/L64, `user-store` L47/L48, `scheduled-quests-store` L88/L89/L95 ×2)** — assert `setItem` is called with the literal storage key and a payload containing the expected fields. | Blanking a persist key orphans every existing user's data on upgrade. Cheap, mechanical, and one shared test shape covers all three stores. |
| 16 | **`quest-timer.ts` notification clearing and misc guards (L160 ×3, L216 ×3, L39, L40, L62, L1201)** | Remaining real gaps; individually low blast radius. |

### Cheapest wins, if time is short

- #9 — one fixture change, 4 mutants.
- #5 — two assertion lines added to existing tests, 3 mutants.
- #6 — three assertions in an existing 35-line test file, 3 mutants.
- #15 — one test shape reused three times, 8 mutants.

### Re-running

```bash
pnpm test:mutate:audit               # full sweep over the configured modules (~30 min)
pnpm test:mutate src/store/user-store.ts   # single module — pass the path directly,
                                            # no `--` separator (pnpm does not strip it,
                                            # so `-- <glob>` leaves `--mutate` without its
                                            # value and misreads <glob> as a config file)
```

Config: `stryker.config.mjs`. Do not add `inPlace: true`. When re-running after fixes,
compare **covered score** module-by-module against §2 — the total score will move for
reasons (new tests reaching new code) that have nothing to do with assertion quality.
**`/tmp/mutation-report.json` will not reappear on its own** — see the note in the
header above. If you want a fresh JSON dump, add `'json'` to the `reporters` array in
`stryker.config.mjs` before running, or re-extract it from the new `index.html`'s
embedded `app.report` object.

---

## 6. Results — 2026-08-09

All 16 items in §5 are implemented, plus a second pass over the survivors the
first pass left behind. Branch `chore/mutation-testing-pilot`, 11 further
commits, still no PR.

### Scores

Verified by a complete, clean audit (1107 mutants, 0 timeouts, 0 errors) taken
at commit `f71242b`. The two later test commits add ~10 assertions and can only
have improved these numbers; they are not reflected below. Full suite green
throughout: 185 suites / 2231 tests, `tsc --noEmit` clean.

| Module | total% | covered% |
| --- | --- | --- |
| `scheduled-quests-store.ts` | 70.21 → 97.87 | 71.74 → **100.00** |
| `user-store.ts` | 25.93 → 94.74 | 30.43 → **100.00** |
| `settings-store.ts` | 29.03 → 80.65 | 34.62 → 86.21 |
| `revenuecat-service.ts` | 18.25 → 57.41 | 50.00 → 72.95 |
| `quest-timer.ts` | 10.04 → 42.17 | 36.15 → 72.25 |
| **All files** | 15.33 → **50.14** | 43.07 → **75.41** |

Killed 174 → 555. No-coverage 731 → 371. Survived 230 → 181.

**Compare covered score, not total.** The mutant population fell 1135 → 1107
because dead defensive code was deleted, so the two totals are not measuring the
same denominator.

**Survivor count is a bad progress metric.** It barely moved while kills
tripled, because reaching previously-unexecuted code *converts* a no-coverage
mutant into a survivor. Judge by killed and no-coverage.

### The finding that mattered most, and that Stryker could not report

`quest-timer.test.ts` mocked the quest store with `activeQuest: { id: … }`. The
solo-start path is guarded by `if (!questStore.activeQuest && …)`, so
`questStore.startQuest` — the line that makes a quest exist — was **structurally
unreachable in every test**, and appeared in the *no-coverage* bucket rather
than as a survivor. §4 read that as "the tests do not reach this code". The
truth was that a single fixture default suppressed it.

Stryker does not mutate fixtures, so it cannot surface this class at all. When a
region reads as no-coverage despite tests that plainly call into it, suspect the
mock's default state before believing the code is unreached.

Second instance of the same shape: `Env.*` is `undefined` in every Jest test
repo-wide (`Env = Constants.expoConfig?.extra ?? {}`, and Jest populates no
`extra`). The iOS and Android `Purchases.configure` branches were therefore
indistinguishable — both configured `{ apiKey: undefined }`. The fix needs an
`expo-constants` stub *plus* a guard test asserting the two keys differ, or the
branch tests silently go vacuous again the next time someone edits the stub.

### Source deleted rather than tested

- `parseJson` / `parseIntSafe`: the `typeof x === 'string'` operands. The
  signatures already guarantee it — unkillable by construction (§4.5).
- Both `typeof store.setLiveActivityId === 'function'` guards. The store always
  defines it, so the `else` was dead code.
- `user-store`'s `onRehydrateStorage`. Its only effect was logging a user id and
  feature flags to the console on every launch.

### Deliberately left alive

- **`settings-store`'s last 4 survivors** sit in an `onRehydrateStorage` handler
  whose only effect is a `console.error`. Unlike the user-store logs, an error
  log on hydration failure has diagnostic value. 86.21% is this module's
  practical ceiling.
- **`onPhoneLocked` updates the Android notification twice for cooperative
  quests** — once in the activation branch, once at the end — with identical
  payloads. The only way to kill that block is `toHaveBeenCalledTimes(2)`, which
  would pin the duplication in place and make deduplicating it a test failure.
  **This is a production defect to ticket, not a test gap.**

### Config changes, and a warning about run time

`stryker.config.mjs` gained a `json` reporter (`reports/mutation/report.json` —
query it with `node -e`, never read the 2.1 MB HTML into an agent context),
`dryRunTimeoutMinutes: 20`, `timeoutMS: 10000`, and `concurrency: 8`.

The audit now takes **50+ minutes**, not the original 30, and can take much
longer. Three causes, all understood:

1. A covered mutant costs a jest run; a no-coverage mutant is free. Halving
   no-coverage roughly doubles the work.
2. **The new tests reach unbounded loops in production code** — `presentPaywall`
   re-invokes itself after enabling test mode, and the cooperative lock-status
   ladder retries on a timer. Mutants that make either unbounded hang until
   Stryker's timeout. These are legitimate kills, but each costs the full
   timeout, and the effective timeout is `dryRunNetTime × 1.5 + timeoutMS`, so
   trimming `timeoutMS` alone barely helps. One run logged 70 hangs and ran
   over four hours.
3. At `concurrency: 12` the box saturated and `login-form.test.tsx` (a
   pre-existing slow suite, ~24s) blew Jest's 5s per-test default *during the
   dry run*, aborting the whole audit. Hence 8.

**Report the TimedOut column alongside the score** — Stryker counts a timeout as
a kill.

`{ advanceTimers: true }` was tried on the quest-timer fake clock to stop the
hangs. It does not work — the loops are in production code, not the clock — and
it introduces nondeterminism under parallel load. Reverted; do not retry it.

---

## 7. `backgroundTask` — 2026-08-09, second pass

`quest-timer.ts` L926–1197 was the single largest untested region left in the
audit set: **~180 no-coverage mutants in one function**, and the function is the
loop that actually runs a quest while the phone is locked — elapsed-time maths,
the progress notification, completion detection, teardown. No test had executed
a line of it.

### How to test it at all

`BackgroundService.start` is mocked, so the task is never invoked. The tests
pull it back off the mock:

```ts
const backgroundTask = BackgroundService.start.mock.calls[0][0];
await backgroundTask(taskData);
```

The loop is `while (BackgroundService.isRunning())`, so `isRunning` is the exit
control. **Every test must either drive the loop to an explicit `break` or flip
`isRunning` false.** Otherwise the loop's
`await new Promise(r => setTimeout(r, updateInterval))` never resolves under
fake timers and the test hangs rather than failing. For a test that needs
exactly one iteration:

```ts
let iterations = 0;
BackgroundService.isRunning.mockImplementation(() => iterations++ < 1);
const running = backgroundTask(taskDataFor(15));
await jest.advanceTimersByTimeAsync(9000); // the loop's update interval
await running;
```

Covered: the no-task-data guard, elapsed-progress maths, completion at the
duration boundary (Live Activity + teardown), the Android-only completion
notification, unlock detection, the stuck-in-pending cooperative completion, and
both cooperative server-activation outcomes.

Progress is asserted at **50%**, deliberately — 0 and 100 are both values that
several mutants of the percentage expression also produce, so asserting at
either end would have been vacuous.

### Verified by mutation, not by a green run

| Mutation | Tests failed (was 0 for all) |
| --- | --- |
| `backgroundTask` body emptied | 7 |
| progress percentage `* 100` → `* 0` | 2 |
| completion boundary `>=` → `>` | 4 |
| `if (!taskData) return` disabled | 1 |

### Re-measuring quest-timer is now impractical, and that is the finding

A single-module `--mutate src/lib/services/quest-timer.ts` run reached only
306/747 mutants in 84 minutes, with **75 timeouts** and slowing. Covering a
`while` loop whose exit condition is a mock means every mutant that removes the
`break`, or keeps the exit condition true, is a **genuine infinite loop** —
correctly killed, but each one costs the full timeout, and the hung workers
appear to starve the remaining ones.

So the scores in §6 remain the last trustworthy measured figures. The
`backgroundTask` work above is verified by the targeted mutations in the table,
not by a fresh score.

If a full number is wanted later, budget hours rather than minutes, and expect
a large TimedOut column that Stryker will count as kills. Do not read the
resulting score as comparable to §6 without subtracting the timeouts.

---

## 8. Third pass — 2026-08-10

Three commits on `chore/mutation-testing-pilot`, still no PR. Full suite green
throughout: 185 suites / 2252 passed / 3 skipped, `tsc --noEmit` clean.

Targets were taken from §7's shortlist, largest first. All three were reached.

### 8.1 `presentPaywall`'s catch block and its unhandled results

`presentPaywall` had tests for two of its six switch arms and none for the
catch block. That block is where a paywall failure is sorted into "this build
is misconfigured, simulate the purchase" or "this is a real store failure,
report it and rethrow". 11 new tests.

**The recursion trap, and how to avoid paying for it.** The misconfiguration
branch sets `testModeEnabled` and then calls `presentPaywall` again. If a test
makes the SDK reject *every* time, then any mutation that stops
`testModeEnabled` being set turns that retry into unbounded recursion — a
Stryker timeout, which costs the full timeout and is one of the causes of the
four-hour runs in §6. Rejecting **once** and resolving `'CANCELLED'` on the
retry turns the identical mutant into an ordinary wrong-return-value failure
that a normal assertion catches in milliseconds.

This generalises: **when a production path retries, make the mock succeed on
the retry.** It costs nothing in coverage and converts timeout-kills into
assertion-kills.

| Mutation | Tests failed (was 0 for all) |
| --- | --- |
| test-mode `return true` → `false` | 4 |
| `throw error` → `return false` | 4 |
| `if (__DEV__)` → `false` | 3 |
| `testModeEnabled = true` → `false` | 3 |
| `readable_error_code ===` → `!==` | 3 |
| `if (__DEV__)` → `true` | 2 |
| `'No offerings found'` → `''` | 2 |
| drop the `?? error?.message` fallback | 2 |
| RESTORED `return true` → `false` | 1 |
| NOT_PRESENTED `return false` → `true` | 1 |
| `default: return false` → `true` | 1 |

Noted, not fixed (out of scope, dev-only): in a development build a rejection
with no error object crashes the catch handler, because L319 reads
`error.message?.includes(...)` — the optional chain is on `.includes`, not on
`.message`. The original failure is replaced by a `TypeError`. Production is
unaffected: the whole block is `__DEV__`-gated.

### 8.2 The cooperative lock-report retry ladder

`quest-timer.ts` L399–445. Three attempts, one second apart, to tell the
server the phone is locked. The entire catch block was no-coverage. 2 new
tests: one proving a failed attempt is retried after the delay, one proving
the ladder stops at three and that **the quest still starts anyway** — the
report is best-effort, and activation is decided by the status check that
follows it. A phone locking in a dead spot must not lose the quest.

| Mutation | Tests failed (was 0 for all) |
| --- | --- |
| catch block emptied | 2 |
| `retryCount < maxRetries` → `false` | 2 |
| `retryCount < maxRetries` → `>=` | 2 |
| drop the `error?.response?.data` chain | 2 |
| `retryCount < maxRetries` → `<=` | 1 |
| `retryCount++` → `retryCount--` | 1 (by timeout — it retries forever) |

**Two equivalent mutants here, confirmed and left alive.** `return true` at
the end of a successful attempt and `return false` after the last one. The
caller is `await sendPhoneLockStatus();` and discards the result. Flipping
either leaves all 73 tests green, and no test could ever tell them apart.
Do not chase these.

### 8.3 The participant-rewards merge — and a third fixture finding

On completion the app fetches the run from the server and merges the server's
adjusted XP into the finished quest. This exists **twice**: once for a quest
the store had made active, once for a quest stuck in pending because the
500 ms starter was missed. Only the first had a test, and neither asserted
anything about the completed-quests history. 2 new tests.

Both merges rewrite that history by matching on quest id **and** stop time,
because a repeatable quest appears in it once per run. Matching on id alone
would overwrite an earlier run with this run's rewards. Each test seeds a
decoy entry sharing the id but not the stop time, which is what makes both
halves of the condition load-bearing.

**The fixture finding (third of its kind — see §6).** The pending path calls
`useQuestStore.setState(state => ({…}))`, the updater-function form. The test
mock was a bare `jest.fn()`: it stores the function and never calls it. So
everything inside that arrow was unreachable in **every** test, and the report
listed it as no-coverage rather than as an untested branch. The mock now runs
updaters against the mock store the way zustand does. All 73 pre-existing
tests pass unchanged.

Three instances of this class now: a mock's `activeQuest` default, `Env.*`
being `undefined` repo-wide, and a `setState` mock that drops updater
functions. **When a region reads as no-coverage despite tests that plainly
call into it, read the mock before reading the code.**

| Mutation | Tests failed (was 0 for all) |
| --- | --- |
| active path `q.id ===` → `!==` | 1 |
| active path `&&` → `\|\|` | 1 |
| active path `q.stopTime ===` → `!==` | 1 |
| pending path `q.id ===` → `!==` | 1 |
| pending path `&&` → `\|\|` | 1 |
| pending path `q.stopTime ===` → `!==` | 1 |
| `if (questRunIdFromQuest)` → `false` | 1 |
| `participants: questRunData.participants` → `[]` | 1 |
| keep the pre-merge quest as `recentCompletedQuest` | 1 |
