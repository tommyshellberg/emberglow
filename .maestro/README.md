# Maestro E2E suite — how it actually behaves

End-to-end tests for the Emberglow / unQuest mobile app, driven by
[Maestro](https://maestro.mobile.dev) against an iOS simulator.

**To run the suite, read [TESTING_GUIDE.md](./TESTING_GUIDE.md).** This file is
the other half: the things that surprised everyone who has worked on these flows,
and the list of `testID`s that exist in the app source but have never been seen
on a real device.

A note on one word used throughout. An **anchor** is a `testID` in the React
Native source. React Native turns it into an accessibility identifier, and a
flow names it to find something on screen. When a flow says
`assertVisible: { id: 'map-screen' }`, `map-screen` is the anchor.

## Where truth lives

This file does not repeat what the flows already say about themselves. Each flow
file opens with a header stating what it assumes, what it leaves behind, what it
deliberately does not cover, and why any surprising step is written that way.
Read the header of the flow you are about to change.

- `run-tests.sh` header — phase order, timing, the test address, the two flows
  that are expected to fail.
- `config.yaml` header — what happens if someone runs `maestro test .maestro/`.
- Each flow's own header — that flow's contract.
- This file — behaviour that spans the whole suite.
- `TESTING_GUIDE.md` — prerequisites, commands, exit codes, troubleshooting.

---

# Anchors that exist in source but have never been seen on a device

**Why this list exists.** When `assertVisible` fails on an anchor, there are two
very different explanations: the anchor is gone from the build (a real
regression), or the app state that renders it was never reachable in the first
place. Without a record, you cannot tell them apart, and people have burned
hours on the second case.

Everything below has been read in the app source. None of it has ever appeared
in a live view hierarchy during this branch's work. **If a flow of yours needs
one of these, expect to build new state first — do not assume it is broken.**

If you sight one on a device, delete its row and say which flow did it.

### Blocked by a single-account chain

The suite builds exactly one account and never gains a friend, a guild or a
second device. Everything here sits behind that wall.

| Anchor                                                                                                                                                                                                                      | Source                                                                                | Why it has never rendered                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coop-menu-option-create`                                                                                                                                                                                                   | `app/cooperative-quest-menu.tsx:168`                                                  | The four-row branch of the co-op menu needs `hasFriends`. A single-account chain can never have a friend.                                                                                                        |
| `coop-menu-option-join`                                                                                                                                                                                                     | same                                                                                  | same                                                                                                                                                                                                             |
| `coop-menu-option-events`                                                                                                                                                                                                   | same                                                                                  | same                                                                                                                                                                                                             |
| `coop-menu-option-friends`                                                                                                                                                                                                  | same                                                                                  | same                                                                                                                                                                                                             |
| `browse-public-events`                                                                                                                                                                                                      | `app/join-cooperative-quest.tsx:246`                                                  | Behind `hasFriends` as well.                                                                                                                                                                                     |
| `guild-row`                                                                                                                                                                                                                 | `features/guilds/components/guilds-section.tsx:131`                                   | The account is never in a guild. Note the trap: `assertNotVisible: guild-row` passes today and would keep passing if the id were renamed.                                                                        |
| `add-guild-button`                                                                                                                                                                                                          | `features/guilds/components/guilds-section.tsx:91`                                    | same                                                                                                                                                                                                             |
| `owner-badge`                                                                                                                                                                                                               | `features/guilds/components/guilds-section.tsx:137`, and again at `guild-card.tsx:46` | same                                                                                                                                                                                                             |
| `join-with-code-link`                                                                                                                                                                                                       | `features/guilds/components/guilds-section.tsx:155`                                   | same                                                                                                                                                                                                             |
| `guild-loading`, `guild-name`, `guild-member-row`, `edit-guild-button`, `invite-members-button`, `edit-name-input`, `edit-tagline-input`, `save-edit-button`, `cancel-edit-button`, `share-invite-code`, `edit-icon-button` | `(app)/guild/[id].tsx`                                                                | The whole screen needs a guild to exist. Creating one is a server write the suite does not make.                                                                                                                 |
| `guild-error-state`                                                                                                                                                                                                         | `(app)/guild/[id].tsx:215`                                                            | Needs a guild _and_ a failing fetch.                                                                                                                                                                             |
| `selected-indicator-<id>`                                                                                                                                                                                                   | `features/guilds/components/guild-icon-selector.tsx:56`                               | Only after a crest is picked, which happens inside guild creation.                                                                                                                                               |
| `invite-friends-button`                                                                                                                                                                                                     | `components/profile/friends-list.tsx:106`                                             | The has-friends header action. Needs a completed invite.                                                                                                                                                         |
| `InviteResultsSummary` (whole component)                                                                                                                                                                                    | `components/profile/contact-import/InviteResultsSummary.tsx`                          | Needs a real invite send. The invite flow deliberately never sends one — an outgoing invitation permanently flips the profile's friends section out of its empty branch and deletes the flow's own entry button. |

### Blocked by a state the suite refuses to create

| Anchor                                            | Source                                                       | Why it has never rendered                                                                                                                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `event-validation-error`                          | `scheduled-quest/create.tsx:172` and `:180`                  | Needs a form submit. The scheduled-quest flow only ever asserts it absent, because submitting creates a real event.                                                                                                                  |
| `create-event-button`                             | `app/scheduled-quest/index.tsx:108`                          | Only asserted absent, as the empty-feed receipt.                                                                                                                                                                                     |
| `quest-detail-screen`, failed branch              | `(app)/quest/[id].tsx:311`                                   | Needs a failed quest run. The account has none, and a failed journal row is not tappable anyway (`features/journal/components/journal-components.tsx:240` only pushes for completed quests). Producing one costs a full quest timer. |
| `settings-row-reminder-time`                      | `(app)/settings.tsx:338`                                     | Only renders while Daily Reminder is switched on, and it is off on every account the suite builds.                                                                                                                                   |
| `invite-add-manual-button` in `EmptyContactsView` | `components/profile/contact-import/EmptyContactsView.tsx:65` | Needs contacts permission to be _denied_. There is a second, different `invite-add-manual-button` in the contacts list — that one has been seen.                                                                                     |
| `PermissionDeniedView` (whole view)               | `components/profile/contact-import/PermissionDeniedView.tsx` | Same denied-permission state.                                                                                                                                                                                                        |
| `social-sign-in-spinner`                          | `components/login/social-sign-in-buttons.tsx:99`             | Needs an OAuth attempt in flight. The social flow exists precisely to never make one.                                                                                                                                                |
| `apple-sign-in-progress`                          | `components/login/social-sign-in-buttons.tsx:383`            | Same. Only ever asserted absent.                                                                                                                                                                                                     |

### Blocked by a race you cannot hold open

| Anchor                | Source                      | Why it has never rendered                                                                                                                            |
| --------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `map-loading`         | `(app)/map.tsx:74`          | The request resolves before the loading branch can be caught. Reaching it needs a cold cache — fresh launch, map tapped first — and is still a race. |
| `leaderboard-loading` | `(app)/leaderboard.tsx:118` | Same.                                                                                                                                                |
| `leaderboard-error`   | `(app)/leaderboard.tsx:142` | Needs a failing request.                                                                                                                             |

### Anchors that are in the source and will never work

These are not "unseen". They are broken, and a flow that names them will fail no
matter what the app does.

| Anchor                                  | Source                                                                    | What is wrong                                                                                                                                                                                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `social-signin-divider`                 | `components/login/social-divider.tsx:29`                                  | The same `View` carries the testID _and_ `accessibilityElementsHidden` / `importantForAccessibility`, so it never reaches the tree. Dead.                                                                                                                                                                               |
| `profile-xp`                            | `components/profile/profile-card.tsx:210`                                 | Never reaches the tree. It is passed to `XPBar`, which forwards it to two child texts as `-level` and `-xp` and never puts it on the root (`emberglow/quest/xp-bar.tsx:78`/`:83`). `scrollUntilVisible` on it fails with "No visible element found". Use `profile-xp-level` or `profile-xp-xp`, both of which are real. |
| `flame-container`                       | `app/AnimatedStreakDay.tsx:65`                                            | Present, but **seven elements share this one id** and none of them expose lit/unlit state. The only interesting thing about them — how many are lit — cannot be named by any selector.                                                                                                                                  |
| the guilds announcement sheet's buttons | `components/modals/guilds-announcement-modal.tsx` (`Maybe Later` at :111) | The modal has **no testIDs at all**. Its buttons can only be named by label, and the safe one is `Maybe Later`.                                                                                                                                                                                                         |

### Not a missing anchor — do not add it to this list

`03-custom-quest.yaml` waits on an id that is deliberately nonsense:
`this-id-does-not-exist-this-step-is-a-90s-timer`. It is an
`extendedWaitUntil` used as a sleep, not a broken anchor. Anyone rebuilding this
list by grepping the flows must exclude it by hand.

---

# How this suite actually behaves

Written for someone who has never run it. Every item here cost somebody a
debugging session.

## Announcement bottom sheets can appear on the home screen

The app shows one-off announcement sheets (a new story branch, the skill tree,
guilds, narrator voices) over the home screen. They are the single most common
reason a flow that passed yesterday fails today. The rules, from
`store/announcement-store.ts:118-148` and `app/(app)/index.tsx:140-189`:

- **One per day, maximum.** The cap compares **local calendar days**
  (`toDateString`) against the last sheet shown. It is not a 24-hour timer:
  the slot resets at local midnight.
- **The cap is checked before anything else.** If a sheet has already shown
  today, _nothing_ shows today — the priority list is never reached.
- **The slot burns at presentation, not at dismissal.** The moment a sheet is
  presented the day is stamped, whether or not anyone closes it.
- **The order is fixed:** branching → skill tree → guilds → narrator voice.
  First unseen one whose preconditions are met wins.
- **It is not a "fresh home screen mount" effect.** The effect re-runs whenever
  any of its dependencies change — including `completedQuestsLength` and `user`.
  So completing a quest can pop a queued sheet with no relaunch and no
  navigation.

What this means for flows:

- **A same-day chain almost never meets one**, because the signup flow's
  narrator-sheet dismissal burns the fresh account's slot on day one. A chain
  run across midnight will meet one. Both are normal.
- Dismiss a sheet only through its own non-destructive button. The branching
  sheet's other button restarts the storyline and destroys the chain. The guilds
  modal has no testIDs, so use the label `Maybe Later`.
- Most flows deliberately do **not** handle sheets. A sheet then makes them fail
  loudly at a post-condition, which is the intent — quiet skipping would be
  worse.

## A green tap on iOS proves nothing

**A green `tapOn`, `longPressOn`, `swipe` or `back` means a touch was
dispatched. It does not mean the app moved.** Eleven separate mechanisms have
now reported success while the screen sat still. `assertVisible` is no safer: it
passes against an element that is fully covered by something else.

**Rule: every action needs a post-condition naming something that exists ONLY
after that action succeeded.** Not "the screen I was already on is still there".

This is made worse by bottom sheets not trapping accessibility focus. With a
sheet covering the screen, the header, the quest deck and all five tabs are
still in the tree, so a `tapOn` by id can match something behind the backdrop
and report success while the touch lands on the scrim.

## Scrolling and carousels

- **Paging carousels move only with explicit start/end coordinate swipes.**
  `scrollUntilVisible` with `LEFT`/`RIGHT`, and swipes anchored to an element,
  both move zero pixels on this build.
- **`direction: DOWN` means opposite things** on `scrollUntilVisible` and on
  `swipe`. Check which one you are writing.
- Before any coordinate-based interaction, **pin the scroll position first**
  (scroll to top, or to a known element). See the next item for why.

## The quest deck is three stacked cards, all of them always present

`deck-card-story`, `deck-card-custom` and `deck-card-coop` are all in the tree
at all times, so `assertVisible` on one proves nothing about which card is
front. Front-ness is: no `Show <mode> card` child, and full-size bounds.

A **back** card's copy is sometimes in the accessibility tree and sometimes not.
Never assume either way — assert on the front card, or on the discriminator
above. The worked versions of both rules live in the headers of
`04-screen-coverage/06-coop-ui.yaml` and `04-screen-coverage/03-custom-quest.yaml`.

## Tab screens stay mounted forever

Tab routes — including the hidden ones (`href: null`) like leaderboard and
achievements — are never unmounted once visited. Their scroll offset, carousel
page and filter chips survive every tab switch and every "back".

Consequences:

- One flow leaving the profile scrolled to its guild section changes where the
  next flow's blind coordinate swipe lands. This has already broken a run.
- A flow that changes a filter must set it back. The journal flow leaves the
  filters on All / All on purpose.
- `router.back()` behaves identically to a push here: expo-router downgrades
  push to navigate for non-stack targets, so there is no growing stack. If a
  screen looks stale, it is mounted-and-stale, not a navigation bug.

## The "connect to 127.0.0.1:22087" error can hide a real failure

This is the Maestro driver, and it usually is a flake — retry up to three times,
especially on the first run after an idle period. **But a genuinely failed
assertion can surface as this exact same error.** That was reproduced
deliberately: a knowingly false assertion produced the connect error, and a
valid assertion right afterwards passed.

**So: after any 22087 retry sequence, re-verify the assertion that was in
flight.** The standing "just retry it" habit can turn a real red into a green.

Related: stale Maestro java processes from previous sessions linger and are the
first suspect when the driver wedges.

## Device-level surprises

- **`clearState` reinstalls the app.** The container path changes on every
  `onboarding-part-1` run, so any cached `xcrun simctl get_app_container` result
  is stale.
- **`pressKey: 'Home'` backgrounds the app on an awake device** — it does not
  lock it. The quest "part 2" flows assume they are handed a locked device. If
  you run one by hand, lock the device first.
- **The sign-in email contains an https interstitial pointing at production.**
  The flows extract the token and build the `unquest://` link themselves. Never
  fetch the interstitial.
- **A push notification can hijack the screen with no tap.** A
  `scheduled_quest_*` push routes straight to `/scheduled-quest[/id]`
  (`app/_layout.tsx:243/:247`) with nothing in the UI gating it. Inert today because
  no account the suite builds has an event — it becomes live the day any flow
  creates one.

## Quest numbers, titles and timing

- **Quest titles come from `data/quests.ts`, never from memory.** quest-1a
  ("Awaken in a Dark Forest") and quest-1b ("Searching the Forest for Signs of
  Life") both pay 9 XP, so pairing the wrong title with the right XP passes
  silently. The chain plays 1b; 1a is never played.
- **Profile XP is order-dependent.** `9 / 150 XP` after two story quests,
  `12 / 150` once the custom quest has paid its +3. The dedicated profile flow
  asserts `9 / 150` and is therefore position-locked to running before the
  coverage phase.
- **Every story-quest wait is 135 seconds** — see `run-tests.sh` note 2. Three
  copies of one dev-only duration knob disagree (Linear SHE-28); 135s is the
  only value that clears all of them.
- **SHE-28 does not apply to custom quests** — they carry no template id, so the
  server's rewrite never touches them. One clock, and a 90-second wait covers a
  60-second quest.
- **SHE-28 is visible in journal data**: run records say 1 MIN where the
  template says 2 MIN. Do not "fix" a flow to match.

## Flows are coupled, and that is the design

The suite is one account's state chain. Two couplings are easy to trip over:

- The signup flow's narrator-sheet dismissal decides which announcement sheets
  every later flow can meet.
- The custom-quest flow adds a journal row and +3 XP, which every later
  assertion about counts or XP has to tolerate.

The documented coverage order and its dependencies live in `run-tests.sh`
note 6. Adding a flow means registering it there — the runner drives an explicit
list, so an unregistered flow simply never runs.

## Known weakness: exit assertions are negative

Most flows prove they ended on the home screen with two or three
`assertNotVisible` lines. A home screen that rendered no quest deck at all would
satisfy them. One positive assertion on a Story-card anchor would make the exit
provable. This is a house-wide pattern, so fixing it is a suite-wide change
rather than a per-file one; it is on the list for this branch's final wave.

The same shape shows up in individual lines worth knowing about:

- `assertNotVisible: 'Start Over'` in the social flow cannot fail on any chain
  this suite builds — the guest and converted branches are mutually exclusive.
  It is documentation wearing an assertion's clothes.
- `assertNotVisible: 'Bottom sheet backdrop'` in the streak flow has never been
  watched failing. Only the invite sheet's backdrop has been seen carrying that
  label on a device.

## What the suite cannot prove

Honest ceilings, so nobody reads a green run as more than it is.

- **Co-op**: on a Release build `__DEV__` is false, so the co-op button is a
  RevenueCat paywall trigger, not a link. The flow reaches the co-op menu by
  deep link — **a route no free-tier user of this build can take** — and asserts
  the `Unlock Cooperative Mode` gate label so a gating change announces itself.
  Ruling from Tommy: keep the deep link. It is coverage of the screen, not of
  the way a user gets there.
- **The map name**: `MAP_NAMES` has one entry, so a name assertion cannot tell a
  working lookup from a stuck fallback.
- **The invite search box** is asserted but never typed into. `searchQuery`
  survives a backdrop close, so a leftover filter would quietly empty the list on
  a later run.
- **The streak screen** can only ever show 1 on a same-day chain, and
  `streak-count` starts at `useState(1)` — the digit equals its own default. The
  value assertion hangs on the `Share your 1 day streak` label instead.
- **Release hides the RevenueCat error (SHE-50); it does not fix it.** A suite
  running on Release is blind to something a developer sees on every launch.
- **Two known-app-bug pins**: the guild join button is asserted _enabled_ on an
  empty invite code (SHE-57) and the event submit button _enabled_ on an empty
  form (SHE-59). Both are deliberate change-detectors. When the guard lands,
  flip the assertion — do not loosen it.

## Working rules that came out of all of this

- If a flow disagrees with the app about a number, **stop and find out which
  side is wrong.** Never edit the expectation to match the app. That rule found
  a real bug (SHE-44).
- Prove an assertion can fail before believing it. Break the app, the data or
  the selector, watch it go red, restore.
- State a flow's entry state, exit state and coverage ceiling in its own header.
  Most of the wrong claims this branch had to fix were comments that outlived
  the code.
