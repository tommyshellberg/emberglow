# Emberglow / unQuest — Maestro E2E testing guide

This is the "how do I run it" document. The companion document,
[README.md](./README.md), is the "how does it actually behave" document: it
holds the suite's mechanism notes and the list of anchors that exist in the app
source but have never been seen on a device. Read both before writing a flow.

## Where the truth lives

Do not trust a summary when the thing itself is a few lines away.

| Question                                                      | Authoritative source                                        |
| ------------------------------------------------------------- | ----------------------------------------------------------- |
| What order do flows run in, and why?                          | The header comment of `.maestro/run-tests.sh`               |
| What does one flow assume and leave behind?                   | That flow file's own header comment                         |
| What happens if someone runs `maestro test .maestro/`?        | The header comment of `.maestro/config.yaml`                |
| How does the app behave under test (sheets, carousels, taps)? | [README.md](./README.md), "How this suite actually behaves" |
| Is this `testID` known to exist on a real device?             | [README.md](./README.md), "Anchors never seen on a device"  |

When two of them disagree, `run-tests.sh` wins. It is the only thing that
actually drives a run.

## The shape of the suite

The whole suite is **one user's state chain**. There is no per-flow fixture and
no login step in the middle. Flow 1 creates an account, and every flow after it
inherits whatever the previous flow left on the screen.

1. **onboarding** — fresh install (`clearState`), character creation, first
   story quest started and unlocked.
2. **signup** — the provisional account becomes a real one. The app asks for a
   magic link, the flow reads the mail out of Mailpit itself, and opens the
   `unquest://` deep link. There is no database script involved.
3. **fresh** — second story quest, tab navigation, the profile numbers, the
   streak celebration screen.
4. **coverage** — every remaining screen, still signed in.
5. **smoke** — one fast critical-path flow.
6. **social** — the login screen. **This flow signs the device out** and
   nothing signs it back in, so it runs last of everything.

Because it is a chain, running a phase on its own only works if an earlier run
left the device where that phase expects it.

## Prerequisites

### 1. Maestro

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
# or
pnpm run install-maestro
```

The suite was built and verified against Maestro 2.0.10 on an iOS simulator.
Android has never been run.

### 2. A Release build of the app on a booted iOS simulator

```bash
pnpm e2e:build   # expo run:ios --configuration Release, APP_ENV=development
```

Bundle id `com.vaedros.unquest`. Use **node 22** (`nvm use 22`).

Release, not a dev client, and this matters:

- A dev client shows a LogBox toast over the tab bar on every launch (a
  pre-existing RevenueCat error, Linear SHE-50) and it swallows taps.
- A Release build is self-contained. Metro must **not** be running, and the app
  still launches. If you feel the need to start Metro, something else is wrong.
- The flip side, worth knowing: Release only **hides** SHE-50. The suite is
  blind to a class of error a developer sees on every launch.
- Release also turns `__DEV__` off, which is why the co-op button is a paywall
  trigger rather than a link — see `04-screen-coverage/06-coop-ui.yaml`.

### 3. Local services

| Service   | Where                               | Why                                                    |
| --------- | ----------------------------------- | ------------------------------------------------------ |
| Backend   | `http://localhost:3001`             | the app talks to it; `npm run dev` in `unquest-server` |
| Mailpit   | `http://localhost:8025`             | the signup flow reads the magic-link mail from it      |
| MongoDB   | `mongodb://127.0.0.1:27017/unquest` | only for the pre-run purge                             |
| `mongosh` | on `PATH`                           | only for the pre-run purge (`brew install mongosh`)    |

The runner's preflight checks every one of these and refuses to start rather
than half-running. `mongosh` and MongoDB are only required for the phases that
create a new account (`all` and `onboarding`).

Note the database name is `unquest`, not `unquest-dev`. Mongo creates databases
lazily, so a purge against a misspelled name succeeds while deleting nothing.

## Running the suite

```bash
pnpm e2e              # every phase, in chain order
pnpm e2e:onboarding   # 01-onboarding/*
pnpm e2e:signup       # 02-signup/*
pnpm e2e:fresh        # 03-fresh-authenticated/*
pnpm e2e:coverage     # 04-screen-coverage/01..09
pnpm e2e:smoke        # 05-smoke/*

.maestro/run-tests.sh social   # 04-screen-coverage/10-social-login.yaml
```

There is no `pnpm e2e:social` script yet; the phase is reached through the
script directly. (Adding the one line to `package.json` is a good first
contribution.)

### What the runner does that a bare `maestro test` cannot

- Generates one `test-<epoch>@example.com` address per run and hands it to the
  flows that need it. **Never `@unquest.test`** — the server validates with
  `Joi.string().email()`, which rejects the reserved `.test` TLD with a 400, so
  a suite using it could never have passed signup.
- Waits **135 seconds** between the two halves of each story quest. Not 15, not 75. The served quest template is 2 minutes, so unlocking before 120s _fails_
  the quest, while the recorded run window is only 60s (three disagreeing copies
  of one dev-only knob — Linear SHE-28). 135s is the only value that clears both
  clocks. Do not optimise it.
- Purges Mailpit and the matching test users before a run that creates an
  account, so a crashed run cannot poison the next one.
- Runs phase 03 in a verified order that is **not** file-name order. Despite its
  `01-` prefix, `01-profile-verification.yaml` runs after both halves of the
  second quest and after `04-navigation-tabs.yaml`, because its `9 / 150 XP`
  assertion only holds once the second quest is complete. The phase then ends
  with `03-streak-celebration.yaml`, which enters through the profile tab and
  hands the device back to home.
- Keeps going after a failure and summarises at the end.

### Exit codes

`pnpm e2e` is safe to gate on. Two flows are wired in but marked
**known-unrevived** — they are expected to fail, and their failure alone does
not make the run red.

| Flow result | Meaning                       | Counts as a failure?                |
| ----------- | ----------------------------- | ----------------------------------- |
| `PASS`      | a revived flow passed         | no                                  |
| `FAIL`      | a revived flow failed         | **yes**                             |
| `XFAIL`     | a known-unrevived flow failed | no — this is the documented outcome |
| `XPASS`     | a known-unrevived flow passed | no, but **act on it**               |

Exit 0 means "no unexpected failures". Exit 1 means at least one revived flow
went red, or preflight refused to start. Before commit `4aa7d00` the runner
counted `XFAIL` into the failure total, so it could never exit 0 at all.

`XPASS` prints a line telling you to flip that flow's `add_stale` to `add_flow`
in `build_steps()` and update note 5 in the runner header. Do it — the whole
point of the marking is that it stays honest.

The two known-unrevived flows today:

- `04-screen-coverage/05-settings.yaml` — last touched July 2026, never re-run
  by any unit. It may well pass; it has simply never been proven to. Expect it
  to XPASS and need re-marking.
- `05-smoke/critical-paths.yaml` — visibly stale. It asserts `MaestroHero` and
  taps a bare screen coordinate. Expected to fail.

### The one cascade you must not misread

`critical-paths.yaml` taps a bare coordinate (`50%, 60%`) meant to land on the
quest deck. If it lands somewhere without a tab bar, the flow dies there and
leaves the device off the tab bar. The very next thing `all` runs is the social
flow, whose first action is a `settings-tab` tap — which recovers from any tab
but not from a screen that has no tab bar. So it fails too, and because it is a
revived flow it reports as a plain `FAIL` that looks like a real defect.

**If one run reports `critical-paths` XFAIL and `10-social-login` FAIL together,
re-run `.maestro/run-tests.sh social` on its own before believing the second
one.** The real fix is a normalising step at the top of the social flow; it is
booked for this branch's final fix wave.

### A full run ends signed out, on purpose

`all` finishes with the social phase, so the device is left on the login screen
with no session. Re-running `pnpm e2e` starts from onboarding with `clearState`,
so that is a valid resting place. To get back to a signed-in device without a
full run you need a fresh chain: onboarding → 135s → part 2 → the signup pair
with a new address.

## Running a subset

### One flow

```bash
maestro test .maestro/flows/04-screen-coverage/04-map.yaml
maestro test .maestro/flows/01-onboarding/onboarding-part-1.yaml --debug
```

Read that flow's header first. Every flow states the entry state it needs and
the exit state it leaves. Most of them need a signed-in account with both story
quests complete, and several need a specific tab.

### A directory run

`maestro test .maestro/` reads `.maestro/config.yaml`, which exists purely as
guard rails for this case. It is **not** a second definition of the suite. It
excludes everything a directory run cannot do correctly:

- `01-onboarding/*` and the second-quest pair — a directory run cannot put a
  135-second wait between two flows, so the second half would always fail.
- `02-signup/*` — needs the generated `TEST_EMAIL`, which has no default there.
- `10-social-login.yaml` — file-name order would run it in the middle and leave
  everything after it logged out.

The flows that _are_ listed still assume a signed-in account with both story
quests complete, so a directory run must be preceded by
`pnpm e2e:onboarding`, `pnpm e2e:signup`, `pnpm e2e:fresh`.

**Known soft spot:** Maestro decides the order of the listed flows itself, and
the listed set is only safe if it keeps `03-fresh-authenticated/` ahead of
`04-screen-coverage/`. `01-profile-verification.yaml` asserts `9 / 150 XP`, and
`03-custom-quest.yaml` pays `+3 XP`, which would make it `12 / 150`. Nothing in
the config enforces that ordering — it holds today because the directory names
sort that way. If you reorganise the directories, this breaks silently. Use
`pnpm e2e` and the question does not arise.

## Expected state at each point in the chain

Numbers come from `data/quests.ts` and the flow headers, not from memory. The
two branch quests both pay 9 XP, so a wrong title pairing can still pass an XP
check — always read the title from `data/quests.ts`.

| After                      | Account                       | Level / XP             | Quests done                                                     | Streak    |
| -------------------------- | ----------------------------- | ---------------------- | --------------------------------------------------------------- | --------- |
| onboarding                 | provisional                   | Level 2, `0 / 150 XP`  | 1 — quest-1 "A Confused Awakening" (+100)                       | 1         |
| signup                     | full (`isProvisional: false`) | unchanged              | unchanged                                                       | unchanged |
| second story quest         | full                          | Level 2, `9 / 150 XP`  | 2 — plus quest-1b "Searching the Forest for Signs of Life" (+9) | still 1   |
| custom quest (coverage 03) | full                          | Level 2, `12 / 150 XP` | 3 — plus "Maestro Custom Quest" (+3)                            | still 1   |

The streak counts calendar days, not quests, so a chain built inside one day
stays at 1 no matter how many quests it completes. The streak celebration screen
still fires — it shows a 1-day streak.

quest-1a "Awaken in a Dark Forest" is the branch this chain never plays. It also
pays 9 XP.

## Assertions: exact values, and no bending them

The suite asserts exact XP, level and streak values so a calculation regression
cannot hide.

```yaml
- assertVisible: 'LEVEL 2'
- assertVisible: '9 / 150 XP'
```

**Maestro 2.0.10 matches text as a case-insensitive FULL-STRING regex.** So
`'9 / 150 XP'` binds to that exact readout, while `'.*9 / 150 XP.*'` would also
match `109 / 150 XP` — which is precisely the confusion the assertion exists to
catch. Do not "relax" an assertion into the wildcard form. The trap is worked
through, with the on-device proof, in
`03-fresh-authenticated/01-profile-verification.yaml:57-71`.

**Standing ruling: if an assertion disagrees with the app, stop and work out
which side is wrong. Never edit the expectation to match the app.** That rule
has already caught one real app bug on this branch (SHE-44, the profile screen
rendering a stale sign-in snapshot).

## Troubleshooting

### The runner refuses to start

Preflight prints exactly which check failed and how to fix it: app not
installed (`pnpm e2e:build`), no booted simulator, backend/Mailpit/Mongo
unreachable, `maestro`/`mongosh` missing, or a flow file that no longer exists.
A missing flow file is fatal on purpose — a phase that silently skips flows is
worse than a red one.

### "Element not visible" on something you can see on the screen

Usually one of the traps in [README.md](./README.md). The most common:

- The element is behind a bottom-sheet backdrop.
- `assertVisible` passed earlier against an _occluded_ element, so the flow is
  not where you think it is.
- The anchor exists in the source but has never rendered on a device — check
  the "Anchors never seen on a device" list before assuming a regression.

Run with `--debug`, and look at `~/.maestro/tests/<timestamp>/` for screenshots.

### "connect to 127.0.0.1:22087"

The Maestro driver. Retry up to three times. **But a genuinely failed assertion
can also surface as this exact error** — it was reproduced deliberately. After
any retry sequence, re-verify the assertion that was in flight before you write
it off as a flake.

### The quest fails instead of completing

You unlocked too early. See the 135-second rule above. Also confirm the backend
is running with `NODE_ENV=development`, which is what serves the shortened quest
duration in the first place.

### The app shows network errors or blank screens

Check `.env.staging`'s `API_URL` against the machine's current IP and that the
backend answers on it. Changing the IP means rebuilding. (Do not open `.env`
files casually — they hold secrets.)

## CI

**These flows do not run in CI, and there is no hook that runs them.** Running
them in CI needs either Apple-billed macOS runners or a paid Maestro Cloud
device farm per PR. They were previously gated behind PR labels and so were not
running on most PRs anyway.

Run them locally before opening or merging a PR with app-facing changes:
`pnpm e2e` for the lot, or a scoped phase.

## Maintenance

### Adding a flow

1. Put it in the right phase directory, named `##-descriptive-name.yaml`.
2. Give it a header that states its entry state, its exit state, what it does
   not cover, and why any surprising step is written the way it is. The existing
   flows are the template — `06-coop-ui.yaml` and `02-journal.yaml` are the
   fullest examples.
3. **Register it in `.maestro/run-tests.sh`.** The runner drives an explicit
   list, never a directory glob. An unregistered flow never runs — four flows
   sat unregistered on this branch until unit Q wired them in.
4. Add it to `.maestro/config.yaml` too, or state there why it is excluded.
5. If it needs a new anchor, add the `testID` in app source and record it in the
   README list until it has been seen on a device.

### After a UI change

Update the assertion _and_ the flow header sentence that explains it. Most of
the wrong claims this branch had to fix were comments that outlived the code
they described.

## Quick reference

| Command                        | Purpose                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| `pnpm e2e`                     | the whole chain (~20 flows, two 135s waits, ends signed out) |
| `pnpm e2e:onboarding`          | fresh install through the first quest                        |
| `pnpm e2e:signup`              | magic link, provisional → full account                       |
| `pnpm e2e:fresh`               | second quest, tabs, profile numbers, streak                  |
| `pnpm e2e:coverage`            | every screen, still signed in                                |
| `pnpm e2e:smoke`               | fast critical-path check (currently known-stale)             |
| `.maestro/run-tests.sh social` | login screen — signs the device out                          |
| `pnpm e2e:build`               | Release build onto the booted simulator                      |

Total runtime for a full run has never been measured; the two mandatory quest
waits alone are 4.5 minutes.

## Key files

- `.maestro/run-tests.sh` — the supported entry point, and the authority on
  order, timing and the test address
- `.maestro/config.yaml` — guard rails for `maestro test .maestro/` only
- `.maestro/README.md` — suite mechanics and the unverified-anchor list
- `.maestro/flows/**/*.yaml` — each one documents itself
- `.env.staging` — API URL the build points at
