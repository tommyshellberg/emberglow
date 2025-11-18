import ActivityKit
import WidgetKit
import SwiftUI
import OneSignalLiveActivities

struct liveactivitiesLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DefaultLiveActivityAttributes.self) { context in
            // --- Calculate Dates and Status First ---
            let status = context.state.data["status"]?.asString() ?? "active"
            let durationMinutes = context.state.data["durationMinutes"]?.asInt() ?? 0
            let title = context.attributes.data["title"]?.asString() ?? "Quest Active"
            
            // Calculate dates based on status
            let (computedStartDate, computedEndDate) = { () -> (Date, Date) in
                if status == "pending" {
                    let now = Date()
                    return (now, now)
                } else {
                    let start = Date()
                    return (start, start.addingTimeInterval(TimeInterval(durationMinutes * 60)))
                }
            }()

            // Determine display texts based on status
            let (displayTitle, displayDescription) = { () -> (String, String) in
                switch status {
                case "pending":
                    return ("Quest Ready", "Lock your phone to begin")
                case "failed":
                    return ("Quest Failed", "Try again next time")
                case "completed":
                    return ("Quest Complete!", "Congratulations on finishing your quest!")
                case "active":
                    return (title, "Focus for \(durationMinutes) minutes")
                default:
                    return (title, "Focus for \(durationMinutes) minutes")
                }
            }()

            // --- Lock Screen View (No TimelineView) ---
            HStack(spacing: 0) {
                // LEFT: App icon - dynamic based on status
                VStack {
                    Spacer()
                    Group {
                        switch status {
                        case "pending":
                            Image(systemName: "safari")
                        case "failed":
                            Image(systemName: "iphone.gen3.badge.exclamationmark")
                        case "completed":
                            Image(systemName: "shield.lefthalf.filled.badge.checkmark")
                        case "active":
                            Image(systemName: "iphone.gen3.slash")
                        default:
                            Image(systemName: "iphone.gen3.slash")
                        }
                    }
                    .font(.system(size: 50))
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(Color(red: 119/255, green: 197/255, blue: 191/255))
                    .padding(.horizontal, 12)
                    Spacer()
                }
                .frame(maxWidth: UIScreen.main.bounds.width * 0.25)
                
                // RIGHT: Text content
                VStack(alignment: .leading, spacing: 4) {
                    Spacer()
                    Text(displayTitle)
                        .font(.headline)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                    
                    Text(displayDescription)
                        .font(.subheadline)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                        
                    if status == "pending" {
                        ProgressView(value: 0.01, total: 1.0)
                            .progressViewStyle(LinearProgressViewStyle(tint: Color(red: 119/255, green: 197/255, blue: 191/255)))
                            .padding(.vertical, 2)
                    } else if status == "active" {
                        ProgressView(timerInterval: computedStartDate...computedEndDate, countsDown: false,
                                     label: { EmptyView() },
                                     currentValueLabel: { EmptyView() })
                            .progressViewStyle(LinearProgressViewStyle(tint: Color(red: 119/255, green: 197/255, blue: 191/255)))
                            .padding(.vertical, 2)
                    } else {
                        // For failed/completed, show full or empty progress bar
                        // TODO: show the progress they were at when they failed
                        ProgressView(value: status == "completed" ? 1.0 : 0.0, total: 1.0)
                            .progressViewStyle(LinearProgressViewStyle(tint: status == "completed" ? Color(red: 119/255, green: 197/255, blue: 191/255) : Color.red))
                            .padding(.vertical, 2)
                    }
                    
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity)
            }
            
        } dynamicIsland: { context in
            // --- Dynamic Island ---
            let status = context.state.data["status"]?.asString() ?? "active"
            let durationMinutes = context.state.data["durationMinutes"]?.asInt() ?? 0
            let title = context.attributes.data["title"]?.asString() ?? "Quest"
            
            // Calculate dates based on status
            let (computedStartDate, computedEndDate) = { () -> (Date, Date) in
                if status == "pending" {
                    let now = Date()
                    return (now, now)
                } else {
                    let start = Date()
                    return (start, start.addingTimeInterval(TimeInterval(durationMinutes * 60)))
                }
            }()

            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "map")
                        .font(.system(size: 20))
                        .foregroundStyle(Color(red: 119/255, green: 197/255, blue: 191/255))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if status == "active" {
                        Text(timerInterval: computedStartDate...computedEndDate, countsDown: false, showsHours: false)
                            .font(.caption)
                            .monospacedDigit()
                            .bold()
                            .frame(width: 45)
                    } else {
                        Text(status)
                            .font(.caption)
                            .bold()
                            .frame(width: 45)
                    }
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(title)
                        .font(.caption)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if status == "pending" {
                        ProgressView(value: 0.01, total: 1.0)
                            .progressViewStyle(LinearProgressViewStyle(tint: Color(red: 119/255, green: 197/255, blue: 191/255)))
                            .padding(.top, 2)
                    } else if status == "active" {
                        ProgressView(timerInterval: computedStartDate...computedEndDate, countsDown: false,
                                     label: { EmptyView() },
                                     currentValueLabel: { EmptyView() })
                            .progressViewStyle(LinearProgressViewStyle(tint: Color(red: 119/255, green: 197/255, blue: 191/255)))
                            .padding(.top, 2)
                    } else {
                        // For failed/completed, show full or empty progress bar
                        ProgressView(value: status == "completed" ? 1.0 : 0.0, total: 1.0)
                            .progressViewStyle(LinearProgressViewStyle(tint: status == "completed" ? Color(red: 119/255, green: 197/255, blue: 191/255) : Color.red))
                            .padding(.top, 2)
                    }
                }
            } compactLeading: {
                Group {
                    switch status {
                    case "pending":
                        Image(systemName: "safari")
                    case "failed":
                        Image(systemName: "iphone.gen3.badge.exclamationmark")
                    case "completed":
                        Image(systemName: "shield.lefthalf.filled.badge.checkmark")
                    case "active":
                        Image(systemName: "iphone.gen3.slash")
                    default:
                        Image(systemName: "iphone.gen3.slash")
                    }
                }
                .foregroundStyle(Color(red: 119/255, green: 197/255, blue: 191/255))
            } compactTrailing: {
                if status == "active" {
                    Text(timerInterval: computedStartDate...computedEndDate, countsDown: false, showsHours: false)
                        .monospacedDigit()
                        .frame(width: 40)
                        .font(.caption)
                } else {
                    Text(status.prefix(4))
                        .frame(width: 40)
                        .font(.caption)
                }
            } minimal: {
                Group {
                    switch status {
                    case "pending":
                        Image(systemName: "safari")
                    case "failed":
                        Image(systemName: "iphone.gen3.badge.exclamationmark")
                    case "completed":
                        Image(systemName: "shield.lefthalf.filled.badge.checkmark")
                    case "active":
                        Image(systemName: "iphone.gen3.slash")
                    default:
                        Image(systemName: "iphone.gen3.slash")
                    }
                }
                .foregroundStyle(Color(red: 119/255, green: 197/255, blue: 191/255))
            }
        }
    }
}
