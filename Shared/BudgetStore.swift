import Foundation
#if canImport(WidgetKit)
import WidgetKit
#endif

@MainActor
final class BudgetStore: ObservableObject {
    @Published private(set) var data = BudgetData()
    @Published var selectedMonth = Date()

    private let storageKey = "budget-pocket-data-v1"
    private var defaults: UserDefaults {
        UserDefaults(suiteName: BudgetConstants.appGroup) ?? .standard
    }

    init() { load() }

    var monthKey: String { BudgetConstants.monthKey(for: selectedMonth) }
    var budget: Int { data.budgets.first(where: { $0.month == monthKey })?.limit ?? 0 }
    var expenses: [Expense] {
        data.expenses
            .filter { BudgetConstants.monthKey(for: $0.date) == monthKey }
            .sorted { $0.date > $1.date }
    }
    var spent: Int { expenses.reduce(0) { $0 + $1.amount } }
    var remaining: Int { budget - spent }

    func categoryTotals() -> [(String, Int)] {
        Dictionary(grouping: expenses, by: \.category)
            .map { ($0.key, $0.value.reduce(0) { $0 + $1.amount }) }
            .sorted { $0.1 > $1.1 }
    }

    func setBudget(_ amount: Int) {
        if let index = data.budgets.firstIndex(where: { $0.month == monthKey }) {
            data.budgets[index].limit = amount
        } else {
            data.budgets.append(MonthlyBudget(month: monthKey, limit: amount))
        }
        save()
    }

    func addExpense(amount: Int, category: String, note: String, date: Date) {
        data.expenses.append(Expense(amount: amount, category: category, note: note, date: date))
        save()
    }

    func deleteExpenses(at offsets: IndexSet) {
        let ids = offsets.map { expenses[$0].id }
        data.expenses.removeAll { ids.contains($0.id) }
        save()
    }

    func moveMonth(by value: Int) {
        selectedMonth = Calendar.current.date(byAdding: .month, value: value, to: selectedMonth) ?? selectedMonth
    }

    private func load() {
        guard let encoded = defaults.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode(BudgetData.self, from: encoded) else { return }
        data = decoded
    }

    private func save() {
        guard let encoded = try? JSONEncoder().encode(data) else { return }
        defaults.set(encoded, forKey: storageKey)
        #if canImport(WidgetKit)
        WidgetCenter.shared.reloadAllTimelines()
        #endif
    }
}

struct BudgetSnapshot {
    let budget: Int
    let spent: Int
    var remaining: Int { budget - spent }

    static func current() -> BudgetSnapshot {
        let defaults = UserDefaults(suiteName: BudgetConstants.appGroup) ?? .standard
        guard let raw = defaults.data(forKey: "budget-pocket-data-v1"),
              let data = try? JSONDecoder().decode(BudgetData.self, from: raw) else {
            return BudgetSnapshot(budget: 0, spent: 0)
        }
        let key = BudgetConstants.monthKey(for: .now)
        let budget = data.budgets.first(where: { $0.month == key })?.limit ?? 0
        let spent = data.expenses.filter { BudgetConstants.monthKey(for: $0.date) == key }.reduce(0) { $0 + $1.amount }
        return BudgetSnapshot(budget: budget, spent: spent)
    }
}
