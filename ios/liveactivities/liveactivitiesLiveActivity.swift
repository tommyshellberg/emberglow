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
    case warning // presence grace: user left the app; counting down to the fail
    case completed
    case failed

    init(rawString: String?) {
        switch rawString {
        case "pending": self = .pending
        case "warning": self = .warning
        case "completed": self = .completed
        case "failed": self = .failed
        default: self = .active // unknown strings fall back to active (spec)
        }
    }

    var sfSymbol: String {
        switch self {
        case .pending: return "safari"
        case .active: return "hourglass"
        case .warning: return "exclamationmark.triangle"
        case .completed: return "checkmark.circle"
        case .failed: return "moon"
        }
    }

    var accent: Color {
        switch self {
        case .pending: return EmberglowTheme.bone.opacity(0.75)
        case .active, .completed: return EmberglowTheme.sandy
        case .warning, .failed: return EmberglowTheme.cinnabar
        }
    }

    var eyebrow: String {
        switch self {
        case .pending: return "QUEST READY"
        case .active: return "QUEST IN PROGRESS"
        case .warning: return "REFOCUS NOW"
        case .completed: return "QUEST COMPLETE"
        case .failed: return "QUEST FAILED"
        }
    }

    var eyebrowColor: Color {
        switch self {
        case .pending: return EmberglowTheme.bone.opacity(0.55)
        case .active, .completed: return EmberglowTheme.sandy
        case .warning, .failed: return EmberglowTheme.cinnabar
        }
    }

    func bodyCopy(durationMinutes: Int) -> String {
        switch self {
        case .pending: return "Lock your phone to begin."
        case .active: return "Keep your phone locked for \(durationMinutes) minutes."
        case .warning: return "Return to Emberglow before the timer runs out."
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
        let minutes = readInt(context.state.data, "durationMinutes")
        status = parsedStatus
        durationMinutes = minutes
        questTitle = context.attributes.data["title"]?.asString() ?? "Quest"

        let now = Date()
        switch parsedStatus {
        case .warning:
            // Client-owned grace flip: counts down to graceEndsAt (epoch s).
            // Once it hits 0:00 it freezes there until the server's failed
            // push replaces it — ActivityKit cannot swap views at a future
            // date without a new content update (accepted spec deviation).
            let graceEndsAt = readInt(context.state.data, "graceEndsAt")
            let end = graceEndsAt > 0
                ? Date(timeIntervalSince1970: TimeInterval(graceEndsAt))
                : now.addingTimeInterval(30)
            timerRange = now ... max(now, end)
        case .active:
            // startedAt (epoch s) anchors the elapsed timer across updates so
            // a grace revert doesn't restart the quest countdown. Absent
            // (legacy payloads / server pushes): historical restart-on-update
            // behavior is preserved.
            let startedAt = readInt(context.state.data, "startedAt")
            if startedAt > 0 {
                let start = Date(timeIntervalSince1970: TimeInterval(startedAt))
                timerRange = start ... start.addingTimeInterval(TimeInterval(minutes * 60))
            } else {
                timerRange = now ... now.addingTimeInterval(TimeInterval(minutes * 60))
            }
        case .pending, .completed, .failed:
            timerRange = now ... now
        }
    }
}

// MARK: - Progress bar

struct QuestProgressBar: View {
    let status: QuestActivityStatus
    let timerRange: ClosedRange<Date>

    private var fill: Color {
        switch status {
        case .warning, .failed: return EmberglowTheme.cinnabar
        case .pending, .active, .completed: return EmberglowTheme.sandy
        }
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
        case .warning:
            // Drains toward zero as the grace runs out.
            ProgressView(
                timerInterval: timerRange,
                countsDown: true,
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

                if model.status == .warning {
                    Text(timerInterval: model.timerRange, countsDown: true, showsHours: false)
                        .font(.system(size: 22, weight: .bold))
                        .monospacedDigit()
                        .foregroundStyle(EmberglowTheme.cinnabar)
                }

                QuestProgressBar(status: model.status, timerRange: model.timerRange)
                    .padding(.top, 4)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }
}

// MARK: - Widget

// Reads an integer from a Live Activity ContentState dictionary, tolerating
// OneSignal's AnyCodable round-tripping the value back as a Double. asInt()
// alone returns nil for a Double-encoded number, which the call sites used to
// silently render as "Focus for 0 minutes" via `?? 0`.
private func readInt(_ data: [String: AnyCodable], _ key: String) -> Int {
    if let intValue = data[key]?.asInt() { return intValue }
    if let doubleValue = data[key]?.asDouble() { return Int(doubleValue) }
    return 0
}

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
                    if model.status == .active || model.status == .warning {
                        Text(timerInterval: model.timerRange, countsDown: model.status == .warning, showsHours: false)
                            .font(.caption)
                            .monospacedDigit()
                            .bold()
                            .foregroundStyle(model.status == .warning ? EmberglowTheme.cinnabar : EmberglowTheme.bone)
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
                if model.status == .active || model.status == .warning {
                    Text(timerInterval: model.timerRange, countsDown: model.status == .warning, showsHours: false)
                        .font(.caption)
                        .monospacedDigit()
                        .foregroundStyle(model.status == .warning ? EmberglowTheme.cinnabar : EmberglowTheme.bone)
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
