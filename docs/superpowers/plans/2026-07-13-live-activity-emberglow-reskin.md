# Live Activity Emberglow Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the iOS quest Live Activity (lock screen + Dynamic Island) to the Emberglow design system — forced-dark Rich Black card, brand palette, Erstoria titles, per-status glyphs, logo in the island identity slots, Guide-voice copy.

**Architecture:** All Swift changes live in one file (`ios/liveactivities/liveactivitiesLiveActivity.swift`): a `QuestActivityStatus` enum centralizes per-status glyph/color/copy (replacing four scattered `switch` blocks), an `EmberglowTheme` enum holds color/font constants, and a `QuestLockScreenView` + island region builders compose the UI. Two asset additions ride along in `ios/liveactivities/` — a logo imageset and the Erstoria TTF. The folder is an Xcode 16 synchronized group, so **no pbxproj edits are needed anywhere**.

**Tech Stack:** SwiftUI / ActivityKit / WidgetKit, OneSignal `DefaultLiveActivityAttributes`, Expo-managed iOS project (`ios/` committed).

**Spec:** `docs/superpowers/specs/2026-07-12-live-activity-emberglow-reskin-design.md` — the state matrix, palette, and copy there are normative. Read it before starting.

**Testing note (deliberate deviation):** The repo has zero Swift test infrastructure and the spec explicitly waives TDD for this reskin (approved in brainstorm). Each task's verification is a compile of the widget-extension scheme; the final task is a scripted simulator walkthrough of all four states. Do not bootstrap XCTest.

**Commit rule:** NEVER add `Co-Authored-By: Claude` or any Claude-attribution trailer to commits (user's global rule — pass it to every subagent).

---

## Prerequisites (Task 0: Environment)

Work happens in a **dedicated worktree** — the user's main checkout has in-progress work on `feat/emberglow-phase-2-base-components` (the branch that also carries this plan + spec).

- [ ] **Step 0.1: Check disk space — hard gate**

```bash
df -h /System/Volumes/Data | tail -1
```

Expected: **≥ 10 GB free.** (At plan-review time the machine had 87 MB free and the baseline build failed with an ENOSPC-class error mid-link. Pod install + a full app build need several GB.) If below, stop and ask the user to free space before proceeding.

- [ ] **Step 0.2: Create worktree and branch** (see @superpowers:using-git-worktrees)

```bash
cd /Users/thomasshellberg/Projects/unquest/unquest
git worktree add ../unquest-la-reskin -b feat/live-activity-emberglow-reskin feat/emberglow-phase-2-base-components
cd ../unquest-la-reskin
```

⚠️ Place the worktree as a **sibling directory** (as above), NOT under `.worktrees/` inside the repo — jest sweeps `.worktrees/` test copies in this project.

- [ ] **Step 0.3: Copy untracked env files from the main checkout** — `.env.*` are not git-tracked, and `env.js` throws on missing/invalid env at build time, so `expo run:ios` hard-fails without them.

```bash
# from inside ../unquest-la-reskin
cp /Users/thomasshellberg/Projects/unquest/unquest/.env.* .
```

- [ ] **Step 0.4: Install dependencies (needed for the iOS build)**

```bash
pnpm install
npx pod-install ios
```

Expected: pods resolve; `ios/Pods/` populated. (~5–10 min cold.)

- [ ] **Step 0.5: Baseline build — verify the extension compiles BEFORE any changes**

```bash
xcodebuild -workspace ios/Emberglow.xcworkspace -scheme liveactivitiesExtension \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -3
```

Expected: the literal line `** BUILD SUCCEEDED **` in the output — do **not** trust the exit code (`tail` in the pipe masks it). If the baseline fails, stop and report — do not proceed on a broken base.

---

### Task 1: Logo asset in the widget extension

**Files:**
- Create: `ios/liveactivities/Assets.xcassets/EmberglowLogo.imageset/logo-1024.png` (copy)
- Create: `ios/liveactivities/Assets.xcassets/EmberglowLogo.imageset/Contents.json`
- Delete: `ios/liveactivities/Assets.xcassets/unquestlogo-downscaled.imageset/`, `ios/liveactivities/Assets.xcassets/unquestlogo-downscaled.png` (stale old-brand logo)

- [ ] **Step 1.1: Verify the old logo is unreferenced (safety check before deleting)**

```bash
rg -l "unquestlogo" ios/liveactivities src | grep -v Assets.xcassets
```

Expected: no output (only the asset files themselves match). If code references appear, keep the old imageset and report.

- [ ] **Step 1.2: Create the imageset**

```bash
mkdir -p ios/liveactivities/Assets.xcassets/EmberglowLogo.imageset
# Absolute path into the MAIN checkout: .claude/ is untracked (git info/exclude),
# so the design-skill assets do not exist in the worktree.
cp /Users/thomasshellberg/Projects/unquest/unquest/.claude/skills/emberglow-design/assets/logo-1024.png \
   ios/liveactivities/Assets.xcassets/EmberglowLogo.imageset/logo-1024.png
```

Write `ios/liveactivities/Assets.xcassets/EmberglowLogo.imageset/Contents.json`:

```json
{
  "images" : [
    {
      "filename" : "logo-1024.png",
      "idiom" : "universal"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
```

(Single-scale universal — the PNG is 1024px, rendered at ≤24pt, so one scale is fine.)

- [ ] **Step 1.3: Delete the stale old-brand logo**

```bash
rm -rf ios/liveactivities/Assets.xcassets/unquestlogo-downscaled.imageset
rm -f ios/liveactivities/Assets.xcassets/unquestlogo-downscaled.png
```

- [ ] **Step 1.4: Verify the extension still builds**

Run the Step 0.5 xcodebuild command. Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 1.5: Commit**

```bash
git add ios/liveactivities/Assets.xcassets
git commit -m "feat(liveactivities): add Emberglow logo asset, drop stale unquest logo"
```

---

### Task 2: Bundle Erstoria in the widget extension

**Files:**
- Create: `ios/liveactivities/Erstoria-Regular.ttf` (copy — synchronized folder auto-adds it to the target)
- Modify: `ios/liveactivities/Info.plist`

- [ ] **Step 2.1: Copy the font into the synchronized folder**

```bash
cp assets/fonts/Erstoria-Regular.ttf ios/liveactivities/Erstoria-Regular.ttf
```

- [ ] **Step 2.2: Register the font in the widget's Info.plist**

The plist is currently only the `NSExtension` dict. Add `UIAppFonts` as a sibling key. Full resulting file:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.widgetkit-extension</string>
	</dict>
	<key>UIAppFonts</key>
	<array>
		<string>Erstoria-Regular.ttf</string>
	</array>
</dict>
</plist>
```

- [ ] **Step 2.3: Verify the extension builds and the font is in the product**

Run the Step 0.5 xcodebuild command. Expected: `** BUILD SUCCEEDED **`. Then confirm bundling:

```bash
find ~/Library/Developer/Xcode/DerivedData -path "*liveactivitiesExtension.appex/Erstoria-Regular.ttf" 2>/dev/null | head -1
```

Expected: one path ending in `liveactivitiesExtension.appex/Erstoria-Regular.ttf` (the product is named after the *target*, `liveactivitiesExtension`, not the folder). If no match, check the build log for a `CpResource` line mentioning the TTF before concluding the font isn't bundled.

- [ ] **Step 2.4: Commit**

```bash
git add ios/liveactivities/Erstoria-Regular.ttf ios/liveactivities/Info.plist
git commit -m "feat(liveactivities): bundle Erstoria font in widget extension"
```

---

### Task 3: Rewrite the Live Activity views

**Files:**
- Modify: `ios/liveactivities/liveactivitiesLiveActivity.swift` (full rewrite, ~230 lines)

The font name is the PostScript name `Erstoria-Regular` (verified from the TTF name table). Payload contract (unchanged): `state.data["status"]` ∈ `pending|active|completed|failed`, `state.data["durationMinutes"]` Int, `attributes.data["title"]` String.

- [ ] **Step 3.1: Replace the entire file content with:**

```swift
import ActivityKit
import OneSignalLiveActivities
import SwiftUI
import WidgetKit

// MARK: - Theme

enum EmberglowTheme {
    static let richBlack = Color(red: 0 / 255, green: 18 / 255, blue: 27 / 255) // #00121b
    static let bone = Color(red: 232 / 255, green: 220 / 255, blue: 199 / 255) // #e8dcc7
    static let sandy = Color(red: 247 / 255, green: 164 / 255, blue: 75 / 255) // #f7a44b
    static let cinnabar = Color(red: 217 / 255, green: 73 / 255, blue: 40 / 255) // #d94928
    static let aegean = Color(red: 44 / 255, green: 69 / 255, blue: 107 / 255) // #2c456b

    static func title(_ size: CGFloat) -> Font {
        .custom("Erstoria-Regular", size: size)
    }
}

// MARK: - Status

enum QuestActivityStatus {
    case pending
    case active
    case completed
    case failed

    init(rawString: String?) {
        switch rawString {
        case "pending": self = .pending
        case "completed": self = .completed
        case "failed": self = .failed
        default: self = .active // unknown strings fall back to active (spec)
        }
    }

    var sfSymbol: String {
        switch self {
        case .pending: return "safari"
        case .active: return "hourglass"
        case .completed: return "checkmark.circle"
        case .failed: return "moon"
        }
    }

    var accent: Color {
        switch self {
        case .pending: return EmberglowTheme.bone.opacity(0.75)
        case .active, .completed: return EmberglowTheme.sandy
        case .failed: return EmberglowTheme.cinnabar
        }
    }

    var eyebrow: String {
        switch self {
        case .pending: return "QUEST READY"
        case .active: return "QUEST IN PROGRESS"
        case .completed: return "QUEST COMPLETE"
        case .failed: return "QUEST FAILED"
        }
    }

    var eyebrowColor: Color {
        switch self {
        case .pending: return EmberglowTheme.bone.opacity(0.55)
        case .active, .completed: return EmberglowTheme.sandy
        case .failed: return EmberglowTheme.cinnabar
        }
    }

    func bodyCopy(durationMinutes: Int) -> String {
        switch self {
        case .pending: return "Lock your phone to begin."
        case .active: return "Keep your phone locked for \(durationMinutes) minutes."
        case .completed: return "You grew stronger today."
        case .failed: return "The quest slipped away. That happens."
        }
    }
}

// MARK: - Payload model

struct QuestActivityModel {
    let status: QuestActivityStatus
    let questTitle: String
    let durationMinutes: Int
    let timerRange: ClosedRange<Date>

    init(context: ActivityViewContext<DefaultLiveActivityAttributes>) {
        let parsedStatus = QuestActivityStatus(rawString: context.state.data["status"]?.asString())
        let minutes = context.state.data["durationMinutes"]?.asInt() ?? 0
        status = parsedStatus
        durationMinutes = minutes
        questTitle = context.attributes.data["title"]?.asString() ?? "Quest"
        // Known issue (spec, Non-Goals): the payload has no startedAt, so the
        // timer range restarts on every update. Behavior unchanged by the reskin.
        let start = Date()
        let end = parsedStatus == .active
            ? start.addingTimeInterval(TimeInterval(minutes * 60))
            : start
        timerRange = start ... end
    }
}

// MARK: - Progress bar

struct QuestProgressBar: View {
    let status: QuestActivityStatus
    let timerRange: ClosedRange<Date>

    private var fill: Color {
        status == .failed ? EmberglowTheme.cinnabar : EmberglowTheme.sandy
    }

    // Spec: Aegean track for non-failed states; failed shows an empty
    // Cinnabar-tinted track (its fill is 0-width, so the track carries the color).
    private var track: Color {
        status == .failed
            ? EmberglowTheme.cinnabar.opacity(0.35)
            : EmberglowTheme.aegean.opacity(0.6)
    }

    var body: some View {
        progressView
            .progressViewStyle(.linear)
            .tint(fill)
            .frame(height: 4)
            .background(track)
            .clipShape(Capsule())
    }

    @ViewBuilder private var progressView: some View {
        switch status {
        case .pending, .failed:
            ProgressView(value: 0, total: 1)
        case .active:
            ProgressView(
                timerInterval: timerRange,
                countsDown: false,
                label: { EmptyView() },
                currentValueLabel: { EmptyView() }
            )
        case .completed:
            ProgressView(value: 1, total: 1)
        }
    }
}

// MARK: - Lock screen

struct QuestLockScreenView: View {
    let model: QuestActivityModel

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: model.status.sfSymbol)
                .font(.system(size: 34, weight: .light))
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(model.status.accent)
                .frame(width: 44, height: 44)

            VStack(alignment: .leading, spacing: 3) {
                Text(model.status.eyebrow)
                    .font(.system(size: 11, weight: .semibold))
                    .kerning(2.4)
                    .foregroundStyle(model.status.eyebrowColor)

                Text(model.questTitle)
                    .font(EmberglowTheme.title(18))
                    .foregroundStyle(EmberglowTheme.bone)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)

                Text(model.status.bodyCopy(durationMinutes: model.durationMinutes))
                    .font(.system(size: 13))
                    .foregroundStyle(EmberglowTheme.bone.opacity(0.72))
                    .lineLimit(2)

                QuestProgressBar(status: model.status, timerRange: model.timerRange)
                    .padding(.top, 4)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }
}

// MARK: - Widget

struct liveactivitiesLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DefaultLiveActivityAttributes.self) { context in
            QuestLockScreenView(model: QuestActivityModel(context: context))
                .activityBackgroundTint(EmberglowTheme.richBlack)
                .activitySystemActionForegroundColor(EmberglowTheme.bone)
        } dynamicIsland: { context in
            let model = QuestActivityModel(context: context)

            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: model.status.sfSymbol)
                        .font(.system(size: 24, weight: .light))
                        .symbolRenderingMode(.hierarchical)
                        .foregroundStyle(model.status.accent)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 1) {
                        Text(model.status.eyebrow)
                            .font(.system(size: 10, weight: .semibold))
                            .kerning(2.2)
                            .foregroundStyle(model.status.eyebrowColor)
                        Text(model.questTitle)
                            .font(EmberglowTheme.title(15))
                            .foregroundStyle(EmberglowTheme.bone)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if model.status == .active {
                        Text(timerInterval: model.timerRange, countsDown: false, showsHours: false)
                            .font(.caption)
                            .monospacedDigit()
                            .bold()
                            .foregroundStyle(EmberglowTheme.bone)
                            .frame(width: 45)
                    } else {
                        Image(systemName: model.status.sfSymbol)
                            .font(.system(size: 16, weight: .light))
                            .foregroundStyle(model.status.accent)
                            .frame(width: 45)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    QuestProgressBar(status: model.status, timerRange: model.timerRange)
                        .padding(.top, 2)
                }
            } compactLeading: {
                Image("EmberglowLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 24, height: 24)
            } compactTrailing: {
                if model.status == .active {
                    Text(timerInterval: model.timerRange, countsDown: false, showsHours: false)
                        .font(.caption)
                        .monospacedDigit()
                        .foregroundStyle(EmberglowTheme.bone)
                        .frame(width: 40)
                } else {
                    Image(systemName: model.status.sfSymbol)
                        .font(.system(size: 14, weight: .light))
                        .foregroundStyle(model.status.accent)
                }
            } minimal: {
                Image("EmberglowLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 22, height: 22)
            }
        }
    }
}
```

- [ ] **Step 3.2: Verify the extension builds**

Run the Step 0.5 xcodebuild command. Expected: `** BUILD SUCCEEDED **`. Compile errors most likely to appear (and their fixes): `ActivityViewContext` generic mismatch (the OneSignal type is `DefaultLiveActivityAttributes` — check `import OneSignalLiveActivities` is present); `Text(timerInterval:)` availability (needs iOS 16.1+; the extension targets 18.2 — do not change deployment targets).

- [ ] **Step 3.3: Commit**

```bash
git add ios/liveactivities/liveactivitiesLiveActivity.swift
git commit -m "feat(liveactivities): reskin live activity to Emberglow design system"
```

---

### Task 4: Full-app build + simulator walkthrough (all four states)

**Files:** none (verification only)

- [ ] **Step 4.1: Build and launch the dev client on a Dynamic-Island simulator**

```bash
npx expo run:ios --device "iPhone 16 Pro"
```

(Any iPhone 14 Pro+ simulator works — the island requires a Pro model. First build is slow.)

- [ ] **Step 4.2: Walk the states.** In the app: pick/create a short custom quest (1–2 min duration) and prepare it.

| State | How to trigger | Verify (against spec state matrix) |
|---|---|---|
| pending | Prepare quest, don't lock yet | Rich Black card on lock screen; compass glyph dim Bone; eyebrow QUEST READY; body "Lock your phone to begin."; empty track |
| active | Lock the sim (Cmd+L), peek lock screen | Hourglass Sandy; QUEST IN PROGRESS; "Keep your phone locked for N minutes."; Sandy timer bar animating |
| completed | Stay locked until duration elapses | Sandy check circle; QUEST COMPLETE; "You grew stronger today."; full Sandy bar; quest name still shown in Erstoria |
| failed | Start another quest, unlock + reopen the app early | Cinnabar moon; QUEST FAILED; "The quest slipped away. That happens."; empty Cinnabar-tinted track |

- [ ] **Step 4.3: Dynamic Island checks** (while a quest is active, unlock to home screen)

- Compact: logo left, monospaced timer right.
- Long-press the island → expanded: glyph / eyebrow + Erstoria title / timer / progress bar.
- Minimal state is hard to force (needs two competing activities) — skip if not reproducible; compact + expanded coverage is sufficient.

Rendering note: the system `.linear` ProgressView draws its own translucent default track on top of our background color, so the track may look slightly gray/washed rather than pure Aegean/Cinnabar. That is a known compositing quirk, not a color bug — only flag it if the track reads as the *wrong hue* (e.g. blue where Cinnabar is expected).

- [ ] **Step 4.4: Both system themes**

Toggle simulator appearance (Features → Toggle Appearance, or Cmd+Shift+A) and re-check the lock screen card stays Rich Black / Bone in **both** light and dark mode.

- [ ] **Step 4.5: Erstoria renders check**

If the quest title renders in a serif that is *not* Erstoria (i.e., falls back to system), the font didn't register — re-check Task 2 (file bundled + `UIAppFonts` spelling). Erstoria is unmistakable next to SF.

- [ ] **Step 4.6: Screenshot each state** (Cmd+S in Simulator) and attach/report them in the task summary.

---

### Task 5: Repo checks + wrap-up

- [ ] **Step 5.1: Confirm no JS regressions (nothing should have changed)**

```bash
git status --short   # expect: clean tree, only committed ios/liveactivities + asset changes
pnpm check-all
```

⚠️ Baseline caveat: this repo has ~420 pre-existing type errors and a filename-case lint issue on a clean tree. Compare failures against the base commit — the requirement is **no new failures**, not zero failures.

- [ ] **Step 5.2: Done.** Use @superpowers:finishing-a-development-branch — present merge/PR options for `feat/live-activity-emberglow-reskin`. Follow-up candidates to mention in the PR body (out of scope, from spec): `startedAt` in the OneSignal payload to fix the progress-restart bug; real brand-icon vectors when SVG exports exist.
