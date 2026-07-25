# Expo SDK 53 Migration (52 → 53) — Design

**Date:** 2026-07-14
**Issue:** [#334](https://github.com/tommyshellberg/emberglow/issues/334) (scoping doc; this spec is the plan-ready design)
**Companion:** [#335](https://github.com/tommyshellberg/emberglow/issues/335) (SDK 53 → 54, blocked by this)

## Why

Apple requires the iOS 26 SDK for App Store uploads (since 2026-04-28). We currently ship SDK 52 via two stopgaps: the EAS iOS image pinned to `macos-sequoia-15.6-xcode-26.2` and a `post_install` fmt-consteval patch in `ios/Podfile`. The pinned image will eventually be deprecated; Expo only guarantees Xcode 26 support from SDK 54+. Expo recommends one SDK hop at a time — this is 52 → 53 only.

## Verified starting state (2026-07-14)

- `expo ~52.0.47`, RN 0.76.9, React 18.3.1, expo-router ~4.0.21, reanimated ~3.16.1, jest-expo ~52.0.3, app version 1.9.0
- New Architecture already enabled (`newArchEnabled: true`)
- Bare workflow: `ios/` + `android/` committed; EAS skips prebuild
- `liveactivitiesExtension` is a **hand-added Xcode target** — no config plugin recreates it (`app.config.ts` plugins end at `onesignal-expo-plugin`). `expo prebuild --clean` would destroy it. OneSignal NSE is plugin-managed but also lives as a committed target.
- `expo-av ~15.0.2` in use only by `src/components/StoryNarration.tsx` (fed by `src/lib/services/audio-cache.service.ts`)
- `@testing-library/react-hooks ^8.0.1` used by exactly 3 test files; RNTL is `^12.9.0` (has built-in `renderHook`)
- `runtimeVersion: Env.VERSION` (app version), `expo-updates ~0.27.4`

## Decisions made (with Tommy, 2026-07-14)

1. **Staging: three sequential PRs** plus one follow-up issue; each PR independently shippable and revertable.
2. **Merge gate for the SDK bump PR: green EAS production builds (both platforms) + simulator/emulator smoke.** Full physical-device regression happens post-merge via TestFlight/internal track.
3. **Native method: in-place upgrade guided by a scratch prebuild diff** (not `prebuild --clean`), plus a follow-up issue to adopt `@bacons/apple-targets` for the Live Activities target after SDK 54, so future upgrades can use prebuild safely.

## PR1 — React 19 test prep (lands on SDK 52)

Rewrite the three `@testing-library/react-hooks` test files to RNTL's built-in `renderHook`:

| File | Lines | Notes |
|---|---|---|
| `src/lib/navigation/navigation-state-resolver.test.ts` | 563 | Core routing coverage — highest care |
| `src/store/character-store.test.ts` | 425 | |
| `src/hooks/use-server-quests.test.ts` | 290 | |

- Mechanical mapping: `renderHook` from `@testing-library/react-native`; `waitForNextUpdate` → `waitFor`.
- Behavior preserved test-by-test: same assertions, same coverage.
- Remove the `@testing-library/react-hooks` dependency. No other dep changes.
- **Gate:** `pnpm check-all` green. Zero runtime risk; no build verification needed.

## PR2 — The SDK 53 bump (JS + native, one PR)

### JS side

- `expo@^53`, then `npx expo install --fix` for the aligned set: RN 0.79.x, React 19, react-dom 19, expo-router 5.x, jest-expo ~53, reanimated ~3.17 (stays v3 — v4 is the SDK 54 hop).
- Add `pnpm.overrides` for `react: 19.x` (changelog-recommended) to resolve peer-dep conflicts.
- RNTL → 13.x; `react-test-renderer` aligned to jest-expo 53's requirement (RNTL 13 drops its react-test-renderer dependency — expect test-infra fallout in `src/lib/test-utils.tsx`).
- **App version bump 1.9.0 → 1.10.0 inside this PR** via the full 5-file bare-workflow procedure (`pnpm version X.Y.Z`). Required because `runtimeVersion` tracks app version: without it, OTA updates built on RN 0.79/React 19 could be delivered to RN 0.76 binaries (crash vector). The bump walls off OTA channels between binaries.

### Native side (in-place, scratch-prebuild diff)

- Generate a fresh SDK 53 prebuild from our `app.config.ts` in a scratch directory; diff against committed `ios/` + `android/`; port template changes as reviewed hunks, including the AppDelegate → Swift move.
- **Preserve explicitly:** OneSignal NSE target, `liveactivitiesExtension` target, Podfile fmt `post_install` patch (RN 0.79 still ships broken fmt), pinned EAS image.
- Bump `onesignal-expo-plugin` to its SDK-53-compatible release. The implementation plan must pin the concrete version up front (currently `^2.0.3`) — an incompatible plugin surfaces only at native build time.
- The plan must record the exact scratch-prebuild command and Expo CLI version used to generate the template diff, so the diff is reproducible during review.

### Watch-items (escape hatches documented in the PR body)

- Metro `package.json:exports` now default-on. Suspects: `zustand@4`, `i18next`, `posthog-react-native`, `socket.io-client`. Escape hatch: `unstable_enablePackageExports: false`; inspect with `EXPO_ATLAS=1`.
- Android linking scheme no longer auto-includes the package name; ours comes from `Env.SCHEME` (`app.config.ts:14`). Smoke-test via `xcrun simctl openurl` / `adb shell am start` — no email round-trip needed pre-merge.
- Android default theme is now `DayNight` — visual check.
- `EX_UPDATES_COPY_EMBEDDED_ASSETS=true` if Android launch assets break.

### Gate

Green EAS production builds on both platforms **and** a **manual** sim/emulator smoke (do not wire Maestro here — existing flows pin outdated copy): quest flow, navigation, story narration (still on expo-av — deprecated but functional in 53), paywall render, deep-link open. Post-merge: physical-device regression via TestFlight/internal track — OneSignal push, magic-link auth end-to-end, Live Activities, background quest timer, offline sync.

## PR3 — expo-av → expo-audio (lands on SDK 53)

- `StoryNarration.tsx` (426 lines): `Audio.Sound.createAsync`/`playAsync`/`unloadAsync`/status callbacks → expo-audio `createAudioPlayer` + `playbackStatusUpdate` listener + expo-audio's `setAudioModeAsync`.
- `audio-cache.service.ts` unchanged — it supplies local file URIs, which expo-audio accepts.
- TDD: adjust/write StoryNarration tests against a mocked `expo-audio` before rewriting.
- Remove `expo-av` from package.json entirely (it is deleted upstream after SDK 54; doing it now shrinks #335).
- Native module set changes (expo-av pod out, expo-audio pod in) → fresh native build required.
- **Gate:** `pnpm check-all` + dev-client/sim build with end-to-end narration smoke: quest complete → narration plays, backgrounding behavior, unload on exit.

## Rollback strategy

- Each PR reverts atomically. Bare workflow keeps all native state in-repo, so `git revert` of PR2 genuinely restores SDK 52.
- OTA isolation via the 1.10.0 runtime version (see PR2).
- EAS image pin + fmt patch both remain in place throughout this migration. Their removal horizons differ: the image pin likely becomes removable at SDK 54 (first official Xcode 26 support), while the fmt patch persists until SDK 56 (RN ≥ 0.83.9, fmt 12.1.0) — relevant for #335, not here.

## Follow-up issue (filed, not implemented here): full CNG adoption

End state is **Continuous Native Generation**: `ios/` and `android/` leave git entirely and are regenerated by prebuild on every EAS build, ending template drift and the manual diff ritual. Scope of the follow-up:

1. Move `liveactivitiesExtension` to `@bacons/apple-targets`: Swift files, Info.plist, assets, and the Erstoria font relocate from `ios/liveactivities/` to a `targets/` directory with an `expo-target.config.js`; the plugin generates the Xcode target during prebuild. (OneSignal NSE is already plugin-managed.)
2. Express the Podfile fmt patch as a small local `withPodfile` config plugin — skippable entirely if adoption lands after SDK 56, where the patch dies (RN ≥ 0.83.9 ships fixed fmt).
3. Audit the committed native trees for undocumented hand-edits; express anything found in `app.config.ts` or local plugins.
4. Verify parity: `expo prebuild --clean` on a branch, then a physical-device pass of every native-touching feature (Live Activities, push, magic-link deep links, background quest timer). Behavior parity, not byte parity, is the bar.
5. De-commit `ios/` + `android/` and gitignore them. Side benefit: version bumps collapse to config-only — the 5-file bare-workflow bump procedure ceases to exist.

Sequencing: after the SDK 54 hop (#335). Not part of this migration — stacking CNG onto an SDK bump would couple the two riskiest native changes available.

## Out of scope

- SDK 54 hop (#335), Reanimated 4, expo-router 6, FlashList 2
- moti / nativewind / @gorhom/bottom-sheet changes
- Maestro flow copy fixes; any feature or design-system work

## References

- [SDK 53 changelog](https://expo.dev/changelog/sdk-53)
- [App Store iOS 26 SDK requirement](https://expo.dev/blog/app-store-connect-minimum-sdk-26)
- fmt context: facebook/react-native#55601, fmtlib/fmt#4740
