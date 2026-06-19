import Foundation

struct Expense: Identifiable, Codable, Hashable {
    let id: UUID
    var amount: Int
    var category: String
    var note: String
    var date: Date

    init(id: UUID = UUID(), amount: Int, category: String, note: String = "", date: Date = .now) {
        self.id = id
        self.amount = amount
        self.category = category
        self.note = note
        self.date = date
    }
}

struct MonthlyBudget: Codable, Hashable {
    var month: String
    var limit: Int
}

struct BudgetData: Codable {
    var budgets: [MonthlyBudget] = []
    var expenses: [Expense] = []
}

enum BudgetConstants {
    static let appGroup = "group.com.example.BudgetPocket"
    static let categories = ["食費", "日用品", "交通", "住居", "趣味", "交際費", "医療", "その他"]

    static func monthKey(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: date)
    }

    static func monthTitle(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ja_JP")
        formatter.dateFormat = "yyyy年M月"
        return formatter.string(from: date)
    }
}
