// DevQuiz Home Screen widget — a GitHub-style "garden" of daily practice plus the
// current streak, mirroring the in-app Streak screen. The React Native app writes
// a JSON snapshot to the shared App Group (see modules/devquiz-widget); this
// widget reads the same key and renders it. Built via `expo prebuild` /
// `@bacons/apple-targets`.
//
// IMPORTANT: keep APP_GROUP in sync with:
//   - app.json  ios.entitlements["com.apple.security.application-groups"]
//   - targets/widget/expo-target.config.js  entitlements
//   - modules/devquiz-widget/ios/DevquizWidgetModule.swift
import WidgetKit
import SwiftUI

private let APP_GROUP = "group.com.yourcompany.devquiz"
private let DATA_KEY = "garden"

// MARK: - Shared data model (matches GardenPayload in src/lib/widget.ts)

struct GardenDay: Codable {
    let date: String
    let count: Int
}

struct GardenPayload: Codable {
    let current: Int
    let longest: Int
    let days: [GardenDay]
}

struct GardenEntry: TimelineEntry {
    let date: Date
    let payload: GardenPayload
}

private let placeholderPayload = GardenPayload(
    current: 0,
    longest: 0,
    days: (0..<119).map { GardenDay(date: "", count: [0, 0, 0, 1, 2, 3][$0 % 6]) }
)

// MARK: - Timeline provider

struct GardenProvider: TimelineProvider {
    func placeholder(in context: Context) -> GardenEntry {
        GardenEntry(date: Date(), payload: placeholderPayload)
    }

    func getSnapshot(in context: Context, completion: @escaping (GardenEntry) -> Void) {
        completion(GardenEntry(date: Date(), payload: readPayload() ?? placeholderPayload))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<GardenEntry>) -> Void) {
        let entry = GardenEntry(date: Date(), payload: readPayload() ?? placeholderPayload)
        // Refresh roughly hourly; the app also force-reloads on each completed lesson.
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func readPayload() -> GardenPayload? {
        guard
            let defaults = UserDefaults(suiteName: APP_GROUP),
            let json = defaults.string(forKey: DATA_KEY),
            let data = json.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(GardenPayload.self, from: data)
    }
}

// MARK: - Views

private func tileColor(_ count: Int) -> Color {
    switch count {
    case ..<1: return Color.gray.opacity(0.18)
    case 1: return Color(red: 0.61, green: 0.89, blue: 0.49)
    case 2: return Color(red: 0.345, green: 0.8, blue: 0.0078)
    default: return Color(red: 0.227, green: 0.541, blue: 0.0)
    }
}

struct GardenGrid: View {
    let days: [GardenDay]
    // 7 rows (weekdays) laid out as columns of weeks.
    var body: some View {
        let columns = stride(from: 0, to: days.count, by: 7).map { Array(days[$0..<min($0 + 7, days.count)]) }
        HStack(spacing: 2) {
            ForEach(Array(columns.enumerated()), id: \.offset) { _, week in
                VStack(spacing: 2) {
                    ForEach(0..<7, id: \.self) { row in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(row < week.count ? tileColor(week[row].count) : Color.clear)
                            .frame(width: 9, height: 9)
                    }
                }
            }
        }
    }
}

struct DevquizWidgetEntryView: View {
    var entry: GardenEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "flame.fill")
                    .foregroundColor(entry.payload.current > 0 ? .orange : .gray)
                Text("\(entry.payload.current)")
                    .font(.system(size: 22, weight: .heavy))
                Text("day streak")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.secondary)
            }
            GardenGrid(days: entry.payload.days)
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(for: .widget) { Color(.systemBackground) }
    }
}

// MARK: - Widget

struct DevquizWidget: Widget {
    let kind: String = "DevquizWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GardenProvider()) { entry in
            DevquizWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Practice garden")
        .description("Your DevQuiz streak and daily practice garden.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct DevquizWidgetBundle: WidgetBundle {
    var body: some Widget {
        DevquizWidget()
    }
}
