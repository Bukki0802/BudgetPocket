import WidgetKit
import SwiftUI

struct BudgetEntry: TimelineEntry {
    let date: Date
    let snapshot: BudgetSnapshot
}

struct BudgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> BudgetEntry { BudgetEntry(date: .now, snapshot: .init(budget: 100_000, spent: 42_500)) }
    func getSnapshot(in context: Context, completion: @escaping (BudgetEntry) -> Void) { completion(.init(date: .now, snapshot: .current())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<BudgetEntry>) -> Void) {
        let entry = BudgetEntry(date: .now, snapshot: .current())
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct BudgetWidgetView: View {
    let entry: BudgetEntry
    private let yen = FloatingPointFormatStyle<Double>.Currency(code: "JPY").precision(.fractionLength(0))

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("今月の残り", systemImage: "yensign.circle.fill").font(.caption).foregroundStyle(.secondary)
            Text(Double(entry.snapshot.remaining), format: yen)
                .font(.system(.title2, design: .rounded, weight: .bold))
                .foregroundStyle(entry.snapshot.remaining < 0 ? .red : .primary)
                .minimumScaleFactor(0.7)
            ProgressView(value: min(Double(entry.snapshot.spent), Double(max(entry.snapshot.budget, 1))), total: Double(max(entry.snapshot.budget, 1)))
                .tint(entry.snapshot.remaining < 0 ? .red : .blue)
            Text("使用済み \(Double(entry.snapshot.spent).formatted(yen))")
                .font(.caption2).foregroundStyle(.secondary)
        }
        .containerBackground(.background, for: .widget)
    }
}

@main
struct BudgetPocketWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BudgetPocketWidget", provider: BudgetProvider()) { entry in
            BudgetWidgetView(entry: entry)
        }
        .configurationDisplayName("残りの予算")
        .description("今月の残り予算をすぐに確認できます。")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
