# Expo SDK 53 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the app from Expo SDK 52 (RN 0.76, React 18) to SDK 53 (RN 0.79, React 19) as three sequential PRs, ending with expo-av fully replaced by expo-audio.

**Architecture:** Three independently shippable PRs per the approved spec (`docs/superpowers/specs/2026-07-14-expo-53-migration-design.md`): PR1 rewrites three test files off the dead `@testing-library/react-hooks`; PR2 bumps the SDK with an in-place native upgrade guided by a scratch-prebuild diff; PR3 migrates `StoryNarration.tsx` to expo-audio. Bare workflow: `ios/` and `android/` are committed, EAS never runs prebuild.

**Tech Stack:** Expo 53.0.x, RN 0.79.x, React 19.0, expo-router 5, jest-expo ~53, RNTL 13.3.x, expo-audio ~0.4.9, pnpm.

---

## Environment prerequisites (every task)

- **Node 22**: `nvm use 22` before any Metro/`pnpm ios` command. Node 24 breaks Metro on this repo.
- Package manager is **pnpm** (`pnpm install`, never npm/yarn).
- **Repo quirk:** `pnpm type-check` has a large pre-existing error count on a clean tree. Always capture the baseline count on the base branch first and judge your work by the **delta**, not by zero.
- **Repo quirk:** Jest sweeps `.worktrees/` inside the repo. Any scratch worktree must live OUTSIDE the repo directory (e.g. `../emberglow-sdk53-template`).
- **Git rule:** NEVER add `Co-Authored-By: Claude` or any Claude-attribution trailer to commits.
- Working directory: `/Users/thomasshellberg/Projects/unquest/unquest`.

---

# Phase 1 — PR1: React 19 test prep (branch `test/react19-hooks-prep`, base `main`)

Pure refactor: swap `@testing-library/react-hooks` (dead under React 19) for RNTL's built-in `renderHook`. RNTL `^12.9.0` (already installed) exports both `renderHook` and `act`. No `waitForNextUpdate` usage exists in any of the three files — this is an import swap. The existing assertions are the safety net: every test must pass **unmodified**.

### Task 1: Branch + baseline

- [ ] **Step 1:** `git checkout main && git pull && git checkout -b test/react19-hooks-prep`
- [ ] **Step 2:** Baseline run — all three files green before touching anything:

```bash
pnpm test src/hooks/use-server-quests.test.ts src/store/character-store.test.ts src/lib/navigation/navigation-state-resolver.test.ts
```

Expected: 3 suites PASS. If not, STOP — fix main first, don't proceed on a broken baseline.

### Task 2: Rewrite `use-server-quests.test.ts`

**Files:** Modify: `src/hooks/use-server-quests.test.ts:2`

- [ ] **Step 1:** Replace line 2:

```ts
// BEFORE
import { renderHook } from '@testing-library/react-hooks';
// AFTER
import { renderHook } from '@testing-library/react-native';
```

The `{ wrapper }` option used throughout this file has the same shape in RNTL — no other changes.

- [ ] **Step 2:** `pnpm test src/hooks/use-server-quests.test.ts` — Expected: PASS, same test count as baseline.
- [ ] **Step 3:** Commit: `git add src/hooks/use-server-quests.test.ts && git commit -m "test: migrate use-server-quests to RNTL renderHook"`

### Task 3: Rewrite `character-store.test.ts`

**Files:** Modify: `src/store/character-store.test.ts:1`

- [ ] **Step 1:** Replace line 1 (this file also imports `act` — RNTL exports it too):

```ts
// BEFORE
import { act, renderHook } from '@testing-library/react-hooks';
// AFTER
import { act, renderHook } from '@testing-library/react-native';
```

- [ ] **Step 2:** `pnpm test src/store/character-store.test.ts` — Expected: PASS.
- [ ] **Step 3:** Commit: `git commit -am "test: migrate character-store to RNTL renderHook"`

### Task 4: Rewrite `navigation-state-resolver.test.ts` (core routing coverage — highest care)

**Files:** Modify: `src/lib/navigation/navigation-state-resolver.test.ts:1`

- [ ] **Step 1:** Replace line 1 import, same swap as Task 2.
- [ ] **Step 2:** One call site uses `rerender` (line ~320). RNTL's `rerender` takes an optional props argument; a bare `rerender()` call is fine. Verify that call site compiles as-is; do NOT restructure the test.
- [ ] **Step 3:** `pnpm test src/lib/navigation/navigation-state-resolver.test.ts` — Expected: PASS with identical test count and zero skipped. If ANY test fails, the fix goes in the test harness usage, never in assertions.
- [ ] **Step 4:** Commit: `git commit -am "test: migrate navigation-state-resolver to RNTL renderHook"`

### Task 5: Remove the dead dependency + PR

- [ ] **Step 1:** `pnpm remove @testing-library/react-hooks`
- [ ] **Step 2:** Guard: `grep -rn "react-hooks" src/ package.json` — Expected: no matches.
- [ ] **Step 3:** `pnpm check-all` — Expected: same result as on main (type-check judged by delta).
- [ ] **Step 4:** Commit + push + PR:

```bash
git commit -am "chore(deps): drop @testing-library/react-hooks (dead under React 19)"
git push -u origin test/react19-hooks-prep
gh pr create --title "test: React 19 prep — migrate renderHook to RNTL" \
  --body "Prep for #334 SDK 53 hop. Pure refactor: swaps @testing-library/react-hooks (React ≤18 only) for RNTL's built-in renderHook in the 3 files that used it. Assertions unchanged. Spec: docs/superpowers/specs/2026-07-14-expo-53-migration-design.md"
```

**Gate:** CI green. Merge before starting Phase 2.

---

# Phase 2 — PR2: The SDK 53 bump (branch `feat/expo-sdk-53`, base `main` after PR1 merges)

### Task 6: Branch + baselines

- [ ] **Step 1:** `git checkout main && git pull && git checkout -b feat/expo-sdk-53`
- [ ] **Step 2:** Record baselines (paste into PR body later):

```bash
pnpm type-check 2>&1 | grep -c "error TS" ; pnpm test 2>&1 | tail -5
```

### Task 7: JS dependency bump

**Files:** Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1:** `npx expo install expo@^53.0.0` (resolves to 53.0.27 or later)
- [ ] **Step 2:** `npx expo install --fix` — aligns the whole expo-* set + RN 0.79.x + React 19 + expo-router 5 + jest-expo ~53 + reanimated ~3.17.
- [ ] **Step 3:** Manual bumps `expo install --fix` won't do — edit `package.json`:
  - `onesignal-expo-plugin`: `^2.0.3` → `^2.7.0` (npm latest as of 2026-07-14; verify SDK 53 support in its release notes at execution time — an incompatible version only surfaces at native build time)
  - `@testing-library/react-native`: `^12.9.0` → `^13.3.3` (drops react-test-renderer dependency)
  - `react-test-renderer`: `18.3.1` → `19.0.0` (must exactly match react; jest-expo still references it)
  - Add pnpm overrides for peer-dep conflicts (changelog-recommended):

```json
"pnpm": {
  "overrides": {
    "react": "19.0.0",
    "react-dom": "19.0.0"
  }
}
```

- [ ] **Step 4:** `pnpm install` — Expected: completes; peer warnings about react resolved by the override.
- [ ] **Step 5:** Sanity: `pnpm list react react-native expo expo-router | head -20` — Expected: react 19.0.0, react-native 0.79.x, expo 53.0.x, expo-router 5.x.
- [ ] **Step 6:** Commit: `git commit -am "chore(deps): bump to Expo SDK 53 / RN 0.79 / React 19"`

### Task 8: Get the Jest suite green

**Files:** Likely: `src/lib/test-utils.tsx`, `jest-setup.ts`, `__mocks__/*`

- [ ] **Step 1:** `pnpm test` — capture failures.
- [ ] **Step 2:** Fix in this order (known-likely fallout): (a) RNTL 13 API drift in `src/lib/test-utils.tsx` (its `render` wrapper API is unchanged, but host-component detection is stricter); (b) React 19 `act` environment warnings — RNTL 13 handles these, don't hand-roll `IS_REACT_ACT_ENVIRONMENT`; (c) outdated mocks in `__mocks__/` that reach into React internals. Rule: fix harness/mocks, never weaken assertions.
- [ ] **Step 3:** `pnpm test` — Expected: same pass count as Task 6 baseline.
- [ ] **Step 4:** `pnpm type-check 2>&1 | grep -c "error TS"` — Expected: ≤ baseline. Fix any NEW errors (React 19 types: `JSX.Element` → `React.JSX.Element`, ref callback return types are the usual suspects).
- [ ] **Step 5:** `pnpm lint` — Expected: parity with baseline.
- [ ] **Step 6:** Commit: `git commit -am "test: fix suite under React 19 / RNTL 13 / jest-expo 53"`

### Task 9: Generate the scratch-prebuild template diff

Produces the ground truth for the native port. The scratch worktree lives OUTSIDE the repo (Jest sweeps `.worktrees/`).

- [ ] **Step 1:**

```bash
git worktree add --detach ../emberglow-sdk53-template feat/expo-sdk-53
cp .env.development .env.staging .env.production ../emberglow-sdk53-template/ 2>/dev/null || cp .env.* ../emberglow-sdk53-template/
cd ../emberglow-sdk53-template && pnpm install
```

- [ ] **Step 2:** Record the CLI version for reproducibility (goes in the PR body): `pnpm exec expo --version`
- [ ] **Step 3:** Generate fresh SDK 53 native projects from our own `app.config.ts` (plugins included — OneSignal NSE will be generated by `onesignal-expo-plugin`):

```bash
rm -rf ios android
EXPO_NO_DOTENV=1 pnpm exec expo prebuild --no-install
```

- [ ] **Step 4:** Back in the main checkout, produce the diffs (committed tree vs generated tree):

```bash
cd /Users/thomasshellberg/Projects/unquest/unquest
diff -ruN --exclude=Pods --exclude=build --exclude='*.lock' ios ../emberglow-sdk53-template/ios > /tmp/ios-template.diff
diff -ruN android ../emberglow-sdk53-template/android > /tmp/android-template.diff
wc -l /tmp/ios-template.diff /tmp/android-template.diff
```

- [ ] **Step 5:** Triage every hunk into three buckets and write the triage as a comment file for review: **(a) PORT** — template changes (AppDelegate→Swift, Gradle/Kotlin bumps, Podfile structure, build settings); **(b) KEEP** — our customizations absent from the generated tree (`liveactivitiesExtension` target + `ios/liveactivities/*`, fmt `post_install` patch at `ios/Podfile:55-70`, any hand-edits); **(c) NOISE** — generated UUIDs, ordering. The KEEP list must contain the Live Activities target and the fmt patch or something is wrong — STOP and investigate.

### Task 10: Port iOS template changes

**Files:** Modify: `ios/Emberglow/AppDelegate.*`, `ios/Emberglow.xcodeproj/project.pbxproj`, `ios/Podfile`, `ios/Podfile.properties.json`; Preserve: `ios/liveactivities/*`, OneSignal NSE target, fmt patch.

- [ ] **Step 1:** Apply the PORT hunks from `/tmp/ios-template.diff`, including replacing the ObjC AppDelegate with the generated Swift one (copy `AppDelegate.swift` from the scratch tree; remove `AppDelegate.h/.mm` references in `project.pbxproj` exactly as the generated project has them — while keeping the `liveactivitiesExtension` and `OneSignalNotificationServiceExtension` target sections untouched).
- [ ] **Step 2:** Merge Podfile: take the template's structural changes, KEEP the fmt patch block verbatim (`ios/Podfile:55-70`, the `fmt_base_h` rewrite in `post_install`).
- [ ] **Step 3:** `npx pod-install` — Expected: succeeds; output includes the fmt patch's marker behavior (pods install clean).
- [ ] **Step 4:** Verify targets survived: `xcodebuild -list -project ios/Emberglow.xcodeproj` — Expected: `Emberglow`, `OneSignalNotificationServiceExtension`, `liveactivitiesExtension` all listed.
- [ ] **Step 5:** Local build: `nvm use 22 && pnpm ios` — Expected: app boots in simulator.
- [ ] **Step 6:** Commit: `git commit -am "chore(ios): port SDK 53 native template changes (AppDelegate Swift, pods)"`

### Task 11: Port Android template changes

**Files:** Modify: `android/build.gradle`, `android/gradle/wrapper/gradle-wrapper.properties`, `android/app/build.gradle`, `android/settings.gradle`, `android/app/src/main/*` per diff.

- [ ] **Step 1:** Apply the PORT hunks from `/tmp/android-template.diff` (Gradle wrapper, AGP/Kotlin versions, MainActivity/MainApplication changes).
- [ ] **Step 2:** Theme check: SDK 53 defaults to `DayNight`. Inspect `android/app/src/main/res/values/styles.xml` in the generated tree vs ours; if the parent theme changed, keep visual behavior stable (force light if that's what the app assumes today).
- [ ] **Step 3:** Linking scheme check: `grep -A5 "android.intent.action.VIEW" android/app/src/main/AndroidManifest.xml` — Expected: an intent-filter with `android:scheme="unquest"`. SDK 53 no longer auto-adds the package name as a scheme; ours must be explicit.
- [ ] **Step 4:** Local build: `pnpm android` — Expected: app boots in emulator.
- [ ] **Step 5:** Commit: `git commit -am "chore(android): port SDK 53 native template changes"`
- [ ] **Step 6:** Cleanup: `git worktree remove ../emberglow-sdk53-template --force`

### Task 12: App version bump 1.9.0 → 1.10.0 (OTA isolation)

`runtimeVersion` tracks app version — without this bump, OTA updates built on RN 0.79 could reach RN 0.76 binaries. The `version` npm script runs `prebuild && git add .`, which can regenerate the Podfile and CLOBBER the fmt patch.

- [ ] **Step 1:** `pnpm version 1.10.0`
- [ ] **Step 2:** **Verify the fmt patch survived:** `grep -c "fmt_base_h" ios/Podfile` — Expected: ≥ 1. If 0: restore the patch block from `git show HEAD~1:ios/Podfile`, re-stage.
- [ ] **Step 3:** Verify the full file set moved: `git show --stat HEAD` (or `git diff --cached --stat` if uncommitted) — Expected: package.json + iOS (Info.plist / project.pbxproj MARKETING_VERSION) + Android (build.gradle versionName) all at 1.10.0.
- [ ] **Step 3b:** The `version` script ran prebuild — re-verify targets survived it: `xcodebuild -list -project ios/Emberglow.xcodeproj` — Expected: `liveactivitiesExtension` and `OneSignalNotificationServiceExtension` still listed.
- [ ] **Step 4:** If `pnpm version` created the commit, amend anything restored in Step 2; else commit: `git commit -am "chore(release): bump app version to 1.10.0"`

### Task 13: Metro `package.json:exports` smoke

SDK 53 enables package exports resolution by default. Suspects in our tree: `zustand@4`, `i18next`, `posthog-react-native`, `socket.io-client`.

- [ ] **Step 1:** `nvm use 22 && pnpm start -c` (clean cache), then boot the dev build from Task 10/11.
- [ ] **Step 2:** Exercise: login screen render, home tab, map tab (POIs), settings; watch Metro output for `Unable to resolve` or dual-package hazards (e.g. two zustand instances → store updates not rendering). To diagnose (not just detect) a suspected dual-package hazard, inspect the bundle with `EXPO_ATLAS=1 pnpm start -c` and look for the same package included twice.
- [ ] **Step 3:** ONLY if breakage traces to exports resolution, apply the documented escape hatch to `metro.config.js` and commit:

```js
// SDK 53 enables package.json:exports; <package> double-resolves under it (see PR body).
// Remove when the offending package ships a fixed exports map.
config.resolver.unstable_enablePackageExports = false;
```

Expected outcome: no escape hatch needed; this step is a checkpoint, not a change.

### Task 14: EAS production builds + manual sim smoke + PR

- [ ] **Step 1:** `pnpm build:production:ios` — Expected: green (image stays pinned to `macos-sequoia-15.6-xcode-26.2` in eas.json — do NOT unpin).
- [ ] **Step 2:** `pnpm build:production:android` — Expected: green.
- [ ] **Step 3:** Manual sim/emulator smoke (both platforms where applicable) — the merge gate agreed in the spec. Do NOT wire Maestro (existing flows pin outdated copy):
  - Fresh install → onboarding → character select renders
  - Create + start a custom quest → countdown → lock phone (sim: cmd+L) → timer continues → completion screen
  - Story quest completion → **StoryNarration plays** (still expo-av here — deprecated in 53 but functional)
  - Paywall screen renders (RevenueCat)
  - Deep link cold + warm: `xcrun simctl openurl booted "unquest://"` and `adb shell am start -a android.intent.action.VIEW -d "unquest://"` — app opens, no crash, navigation resolver lands somewhere sane
  - Sign out → sign in (magic-link request fires; full email round-trip is post-merge device work)
- [ ] **Step 4:** `pnpm check-all` one final time; push; open PR. PR body MUST include: version table (before/after), Expo CLI version used for the template diff (Task 9 Step 2), the KEEP-list confirmation (Live Activities target + fmt patch preserved), escape hatches (`unstable_enablePackageExports: false`, `EX_UPDATES_COPY_EMBEDDED_ASSETS=true`), and the post-merge device regression checklist (Phase 4).

**Gate:** green production builds + smoke checklist all ✅. Post-merge: Phase 4 device regression.

---

# Phase 3 — PR3: expo-av → expo-audio (branch `feat/expo-audio-migration`, base `main` after PR2 merges)

@superpowers:test-driven-development applies here — this is the one phase with real behavior change. No StoryNarration test exists today; write it against the expo-audio contract first (red), then migrate (green).

**API mapping (expo-av → expo-audio ~0.4.9).** Verify exact option/field names against expo-audio docs at execution time (context7 or docs.expo.dev) — the table below is the expected shape:

| expo-av (current code) | expo-audio |
|---|---|
| `Audio.setAudioModeAsync({ playsInSilentModeIOS, staysActiveInBackground, shouldDuckAndroid })` | `setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionModeAndroid: 'duckOthers' })` |
| `Audio.Sound.createAsync(source, { shouldPlay: false }, cb)` | `createAudioPlayer(source, 100)` + `player.addListener('playbackStatusUpdate', cb)` |
| `status.isLoaded / isPlaying / positionMillis / durationMillis / didJustFinish` | `status.isLoaded / playing / currentTime / duration / didJustFinish` — **currentTime/duration are SECONDS, not millis** |
| `sound.playAsync() / pauseAsync()` (async) | `player.play() / player.pause()` (synchronous) |
| `sound.stopAsync(); sound.playFromPositionAsync(0)` | `await player.seekTo(0); player.play()` |
| `sound.unloadAsync()` | `player.remove()` |
| `getStatusAsync()` polling every 100ms | delete the interval — `playbackStatusUpdate` fires on the player's `updateInterval` (100ms) |

The seconds-vs-millis change: keep `duration`/`position` state in **milliseconds** (multiply by 1000 at the listener boundary) so `progress`, the animated fill, and all render math stay untouched.

### Task 15: Failing test + mock (red)

**Files:** Create: `src/components/story-narration.test.tsx`, `__mocks__/expo-audio.ts`; Modify: `package.json`

- [ ] **Step 1:** `npx expo install expo-audio` — Expected: `expo-audio@~0.4.x` added. (Installing the dependency now keeps the red-phase failure on the assertion, not on module resolution.)
- [ ] **Step 2:** Create `__mocks__/expo-audio.ts`:

```ts
type StatusListener = (status: any) => void;
const listeners: StatusListener[] = [];

export const mockPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn(),
  addListener: jest.fn((event: string, cb: StatusListener) => {
    if (event === 'playbackStatusUpdate') listeners.push(cb);
    return { remove: jest.fn() };
  }),
  currentTime: 0,
  duration: 120,
  playing: false,
};

export const createAudioPlayer = jest.fn(() => mockPlayer);
export const setAudioModeAsync = jest.fn().mockResolvedValue(undefined);

// Test helper: drive the status listener from tests.
export const __emitStatus = (status: any) =>
  listeners.forEach((cb) => cb(status));
export const __resetAudioMock = () => {
  listeners.length = 0;
  Object.values(mockPlayer).forEach((v) => {
    if (jest.isMockFunction(v)) v.mockClear();
  });
  (createAudioPlayer as jest.Mock).mockClear();
  (setAudioModeAsync as jest.Mock).mockClear();
};
```

- [ ] **Step 3:** Write `src/components/story-narration.test.tsx` — ONE test first, per TDD. NOTE: the mock helpers (`mockPlayer`, `__emitStatus`, `__resetAudioMock`) are accessed via `jest.requireMock`, NOT an ES import from `'expo-audio'` — the real package doesn't export them, so importing them would add TS2305 errors to the type-check delta:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';

jest.mock('expo-audio');
jest.mock('@/lib/services/audio-cache.service', () => ({
  audioCacheService: {
    getAudioSource: jest.fn().mockResolvedValue({ uri: 'file:///cached/quest-1.mp3' }),
  },
}));

import { StoryNarration } from './StoryNarration';

const { createAudioPlayer, mockPlayer, __emitStatus, __resetAudioMock } =
  jest.requireMock('expo-audio');

const quest = { id: 'quest-1', title: 'Test Quest' } as any;

beforeEach(() => __resetAudioMock());

it('creates an expo-audio player for the cached quest audio', async () => {
  render(<StoryNarration quest={quest} />);
  await waitFor(() =>
    expect(createAudioPlayer).toHaveBeenCalledWith(
      { uri: 'file:///cached/quest-1.mp3' },
      expect.anything()
    )
  );
});
```

- [ ] **Step 4:** Run: `pnpm test src/components/story-narration.test.tsx` — Expected: **FAIL** (component still imports expo-av; `createAudioPlayer` never called). This is the red phase — do not skip verifying the failure reason.
- [ ] **Step 5:** Commit: `git add -A && git commit -m "test: add failing StoryNarration expo-audio contract test"`

### Task 16: Migrate the component (green)

**Files:** Modify: `src/components/StoryNarration.tsx` (lines 2, 32, 55–124, 127–157, 160–187, 190–221)

- [ ] **Step 1:** Migrate `StoryNarration.tsx` per the mapping table. Core shape of the init effect:

```tsx
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';

const playerRef = useRef<AudioPlayer | null>(null);

// inside initializeAudio():
await setAudioModeAsync({
  playsInSilentMode: true,
  shouldPlayInBackground: false,
  interruptionModeAndroid: 'duckOthers',
});
const audioSource = await audioCacheService.getAudioSource(audioPath);
if (!audioSource) throw new Error('No audio source found for quest');

const player = createAudioPlayer(audioSource, 100); // 100ms status updates
player.addListener('playbackStatusUpdate', onPlaybackStatusUpdate);
if (!isMounted) {
  player.remove();
  return;
}
playerRef.current = player;

// status callback — NOTE: expo-audio reports SECONDS; state stays in ms:
const onPlaybackStatusUpdate = (status: AudioStatus) => {
  if (!status.isLoaded) return;
  setIsPlaying(status.playing);
  setPosition((status.currentTime ?? 0) * 1000);
  setDuration((status.duration ?? 0) * 1000);
  if (status.didJustFinish) {
    setIsPlaying(false);
    setPosition(0);
  }
};
```

Also: `togglePlayback` uses `player.pause()` / `player.play()` (sync, drop the awaits); `handleReplay` becomes `await player.seekTo(0); player.play();`; cleanup + AppState + focus handlers call `player.pause()` / `player.remove()`; DELETE `startProgressTracking`/`stopProgressTracking` and `progressIntervalRef` entirely (the 100ms `updateInterval` on the player replaces polling); `setAudioInitialized`/`setDuration` move into the first status event since `createAudioPlayer` returns synchronously.

- [ ] **Step 2:** `pnpm test src/components/story-narration.test.tsx` — Expected: PASS.
- [ ] **Step 3:** Add the remaining behavior tests one at a time (each: write → run red if it exposes a gap → fix → green): tap play → `mockPlayer.play()` called; `__emitStatus({ isLoaded: true, playing: true, currentTime: 30, duration: 120 })` → progress reflects 25%; `didJustFinish` resets to start state; unmount → `mockPlayer.remove()` called.
- [ ] **Step 4:** `pnpm test` (full suite) — Expected: green.
- [ ] **Step 5:** Commit: `git commit -am "feat: migrate StoryNarration from expo-av to expo-audio"`

### Task 17: Remove expo-av + native verify + PR

- [ ] **Step 1:** `pnpm remove expo-av`
- [ ] **Step 2:** Guard: `grep -rn "expo-av" src/ package.json app.config.ts` — Expected: no matches.
- [ ] **Step 3:** `npx pod-install` (pod set changes: expo-av out, expo-audio in), then `nvm use 22 && pnpm ios`.
- [ ] **Step 4:** Manual narration smoke in sim: complete a story quest → narration plays → pause/resume → replay → background the app mid-playback (audio pauses) → leave screen (no crash, player released). Run the same on `pnpm android`.
- [ ] **Step 5:** `pnpm check-all` — Expected: parity with baseline.
- [ ] **Step 6:** Commit remaining changes, push, PR:

```bash
git push -u origin feat/expo-audio-migration
gh pr create --title "feat: migrate story narration to expo-audio" \
  --body "Final piece of #334. Replaces expo-av (deprecated in SDK 53, removed after 54) with expo-audio in StoryNarration. audio-cache.service untouched (still supplies file URIs). Native module set changed — requires new build. Spec: docs/superpowers/specs/2026-07-14-expo-53-migration-design.md"
```

**Gate:** check-all + dev-build narration smoke.

---

# Phase 4 — Post-merge follow-ups (no code)

### Task 18: Device regression, issue hygiene

- [ ] **Step 1:** TestFlight/internal-track device regression (from PR2's body): OneSignal push received; magic-link auth full email round-trip; Live Activities on lock screen during a quest; background quest timer survives lock + app kill; offline sync reconnect.
- [ ] **Step 2:** File the CNG follow-up issue:

```bash
gh issue create --repo tommyshellberg/emberglow \
  --title "Adopt Continuous Native Generation (de-commit ios/ and android/)" \
  --body "$(sed -n '/## Follow-up issue/,/## Out of scope/p' docs/superpowers/specs/2026-07-14-expo-53-migration-design.md | sed '$d')

Sequencing: after the SDK 54 hop (#335). Origin: #334 planning session."
```

- [ ] **Step 3:** Close #334 with links to the three PRs; note on #335 that it's unblocked.
