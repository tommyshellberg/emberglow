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
