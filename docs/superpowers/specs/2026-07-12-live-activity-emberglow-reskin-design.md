# Live Activity — Emberglow Reskin (Design)

**Date:** 2026-07-12
**Status:** Approved in brainstorm (visuals signed off against rendered mocks)
**Scope:** iOS Live Activity only — lock-screen card + Dynamic Island (expanded / compact / minimal), all four quest statuses.

## Context

The quest Live Activity (`ios/liveactivities/liveactivitiesLiveActivity.swift`, driven by OneSignal `DefaultLiveActivityAttributes`) still wears the old UnQuest skin: teal `#77c5bf` accents, filled SF Symbols, a system-adaptive background that renders **light** in light mode, and copy that breaks the Emberglow voice ("Quest Complete! Congratulations…"). The payload provides three fields: `status` (`pending | active | completed | failed`), `durationMinutes` (Int), and `title` (quest name, from attributes).

Design-system source of truth: `.claude/skills/emberglow-design/` (readme + tokens).

## Goals

1. Force-dark, Emberglow-branded Live Activity on both surfaces, all four statuses.
2. Emberglow logo as the identity mark in the Dynamic Island compact-leading and minimal slots.
3. Erstoria for quest titles; system font elsewhere.
4. Rewrite all status copy to the Guide voice.
5. Quest name stays visible in every state (today, completed/failed replace it with generic text).

## Non-Goals

- **Android** — no Live Activity equivalent in the repo; OneSignal stock notification unchanged.
- **Progress-restart bug** — `computedStartDate` is recomputed as `Date()` on every render, so the bar restarts on each OneSignal update (existing `TODO` in file). Fixing it needs a `startedAt` timestamp in the payload (JS/server change). Documented, not fixed here.
- **Failed-state progress %** — not in the payload (same root cause); failed shows an empty Cinnabar-tinted track.
- **Custom brand-icon vectors** — the brand guide's icon set has no SVG exports yet. SF Symbols are a *flagged substitution*, consistent with the app's Lucide substitution.
- **Source Sans 3** — body text uses SF; at 12–13pt it is visually equivalent and avoids bundling a second font.

## Decisions (brainstorm outcomes)

| Question | Decision |
|---|---|
| Surfaces | Lock screen + full Dynamic Island |
| Copy | Rewrite to Guide voice in the same change |
| Typography | Erstoria titles + system body (PostScript name verified: `Erstoria-Regular`) |
| Lock-screen icon slot | Per-status thin-line glyphs (mockup B); **no** small logo stamp (too small to be useful) |
| Logo placement | Dynamic Island compact-leading + minimal slots (~24pt; brand-guide minimum is 25px — accepted, it is the conventional identity slot) |

## Visual Spec

### Palette (from design tokens)

| Token | Hex | Use |
|---|---|---|
| Rich Black | `#00121b` | `activityBackgroundTint` (forced dark) |
| Bone | `#e8dcc7` | Titles (100%), body (72%), `activitySystemActionForegroundColor` |
| Sandy Brown | `#f7a44b` | Active/complete accents, eyebrow, progress fill |
| Cinnabar | `#d94928` | Failed accents |
| Aegean Blue | `#2c456b` | Progress track, non-failed states (~60% opacity) |

### Lock-screen layout

`HStack`: status glyph (34pt symbol in a 44pt slot, `.light` weight) → text stack:

1. **Eyebrow** — status label, SF 10–11pt semibold, uppercase, ~0.22em kerning.
2. **Title** — quest name, `Font.custom("Erstoria-Regular", size: 18)`, Bone, `lineLimit(1)`, `minimumScaleFactor(0.8)`.
3. **Body** — one Guide-voice line, SF 12–13pt, Bone @ 72%.
4. **Progress** — 4pt bar; active uses `ProgressView(timerInterval:)` as today.

Background: `.activityBackgroundTint(richBlack)` + `.activitySystemActionForegroundColor(bone)` so the card is dark in both system themes.

### State matrix

| Status | Glyph (SF Symbol) | Glyph color | Eyebrow | Body | Progress |
|---|---|---|---|---|---|
| pending | `safari` (compass) | Bone @ 75% | QUEST READY (Bone @ 55%) | Lock your phone to begin. | empty track |
| active | `hourglass` | Sandy | QUEST IN PROGRESS (Sandy) | Keep your phone locked for N minutes. | live timer bar, Sandy fill |
| completed | `checkmark.circle` | Sandy | QUEST COMPLETE (Sandy) | You grew stronger today. | full, Sandy |
| failed | `moon` | Cinnabar | QUEST FAILED (Cinnabar) | The quest slipped away. That happens. | empty, Cinnabar tint |

Copy rules: sentence case, no emoji, no exclamation marks; the body never repeats the status (the eyebrow carries it). Unknown status strings fall back to `active` explicitly.

### Dynamic Island

| Region | Content |
|---|---|
| Compact leading | Logo (`Image("EmberglowLogo")`, resizable/fit, ~24pt) |
| Compact trailing | active → `Text(timerInterval:)` monospaced digits, Bone; other states → small status glyph in its status color (replaces today's truncated `status.prefix(4)` text) |
| Minimal | Logo |
| Expanded leading | Status glyph (as lock screen, ~26pt) |
| Expanded center | Eyebrow + Erstoria quest title (14–16pt) |
| Expanded trailing | Timer, monospaced, Bone (active); status glyph otherwise |
| Expanded bottom | Progress bar (same rules as lock screen) |

## Code Structure

All Swift changes stay in **`liveactivitiesLiveActivity.swift`** (single file, no new pbxproj source entries):

- `enum QuestActivityStatus` — parsed once from the payload string; computed properties `sfSymbol`, `accent`, `eyebrow`, `body(durationMinutes:)`. Replaces the four scattered `switch status` blocks; explicit `.active` fallback for unknown strings.
- `enum EmberglowTheme` — color constants + Erstoria font helper; single source for hex values.
- `LockScreenView` — extracted lock-screen composition; island regions become small builders using the same enum.

Rationale for single-file: the widget is one surface and the file stays small (~300 lines). Note: `ios/liveactivities/` is an Xcode 16 synchronized folder, so new `.swift` files there would auto-join the target — splitting is *possible* without pbxproj edits, just not warranted.

## Asset & Target Changes

1. **Logo:** copy `.claude/skills/emberglow-design/assets/logo-1024.png` into the existing `ios/liveactivities/Assets.xcassets` as `EmberglowLogo.imageset` (universal, single scale). No pbxproj change needed — the catalog is already in the target.
2. **Font:** copy `assets/fonts/Erstoria-Regular.ttf` into `ios/liveactivities/` — the folder is an Xcode 16 synchronized group (only `Info.plist` is excepted), so the file auto-joins the extension bundle with **no pbxproj edit** — and register it via `UIAppFonts` in `ios/liveactivities/Info.plist`. The main app already bundles this font separately; the widget extension needs its own copy.

## Verification

- Build: `expo run:ios` (or xcodebuild) must compile the widget extension.
- Manual walkthrough on an iPhone Pro simulator (Dynamic Island capable): start a quest and observe pending → active → completed on the lock screen and island (expanded/compact/minimal); force a fail for the failed state.
- Check both system light and dark mode — card must stay Rich Black in both.
- `pnpm check-all` still passes (no JS changes expected).
- No automated Swift tests: the repo has zero Swift test infrastructure and a reskin does not justify bootstrapping XCTest. This is a deliberate, flagged deviation from the repo's TDD default, accepted during brainstorm.

## Known Issues Carried Forward

- Progress bar restarts on every activity update (see Non-Goals) — candidate follow-up: include `startedAt` in the OneSignal payload from `quest-timer.ts`.
- Fixed-width frames (`45pt`/`40pt`) on island trailing text are kept as-is unless they clip the styled timer during verification.
