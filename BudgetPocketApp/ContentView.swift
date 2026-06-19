import SwiftUI
import Charts

struct ContentView: View {
    @EnvironmentObject private var store: BudgetStore
    @State private var showingExpense = false
    @State private var showingBudget = false

    private let yen = FloatingPointFormatStyle<Double>.Currency(code: "JPY").precision(.fractionLength(0))

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    monthPicker
                    summaryCard
                    categoryCard
                    expenseList
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("予算")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showingExpense = true } label: { Label("支出を追加", systemImage: "plus") }
                }
            }
            .sheet(isPresented: $showingExpense) { AddExpenseView() }
            .sheet(isPresented: $showingBudget) { BudgetEditorView() }
        }
    }

    private var monthPicker: some View {
        HStack {
            Button { store.moveMonth(by: -1) } label: { Image(systemName: "chevron.left") }
            Spacer()
            Text(BudgetConstants.monthTitle(for: store.selectedMonth)).font(.headline)
            Spacer()
            Button { store.moveMonth(by: 1) } label: { Image(systemName: "chevron.right") }
        }
        .padding(.horizontal, 8)
    }

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("残りの予算").font(.subheadline).foregroundStyle(.secondary)
                Spacer()
                Button("予算を設定") { showingBudget = true }.font(.subheadline)
            }
            Text(Double(store.remaining), format: yen)
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .foregroundStyle(store.remaining < 0 ? .red : .primary)
            ProgressView(value: min(Double(store.spent), Double(max(store.budget, 1))), total: Double(max(store.budget, 1)))
                .tint(store.remaining < 0 ? .red : .blue)
            HStack {
                Label("使用済み \(Double(store.spent).formatted(yen))", systemImage: "cart")
                Spacer()
                Text("予算 \(Double(store.budget).formatted(yen))")
            }
            .font(.caption).foregroundStyle(.secondary)
        }
        .padding().background(.background, in: RoundedRectangle(cornerRadius: 18))
    }

    @ViewBuilder private var categoryCard: some View {
        let totals = store.categoryTotals()
        if !totals.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text("カテゴリ別").font(.headline)
                Chart(totals, id: \.0) { item in
                    BarMark(x: .value("金額", item.1), y: .value("カテゴリ", item.0))
                        .foregroundStyle(by: .value("カテゴリ", item.0))
                }
                .chartLegend(.hidden).frame(height: CGFloat(max(130, totals.count * 34)))
                ForEach(totals, id: \.0) { item in
                    HStack { Text(item.0); Spacer(); Text(Double(item.1), format: yen).fontWeight(.semibold) }
                        .font(.subheadline)
                }
            }
            .padding().background(.background, in: RoundedRectangle(cornerRadius: 18))
        }
    }

    private var expenseList: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("支出履歴").font(.headline)
            if store.expenses.isEmpty {
                ContentUnavailableView("支出はまだありません", systemImage: "tray", description: Text("右上の＋から入力できます"))
                    .frame(minHeight: 180)
            } else {
                ForEach(store.expenses) { expense in
                    HStack {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(expense.category).fontWeight(.medium)
                            Text(expense.note.isEmpty ? expense.date.formatted(date: .abbreviated, time: .omitted) : expense.note)
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(Double(expense.amount), format: yen).fontWeight(.semibold)
                    }
                    Divider()
                }
                .onDelete(perform: store.deleteExpenses)
            }
        }
        .padding().background(.background, in: RoundedRectangle(cornerRadius: 18))
    }
}
