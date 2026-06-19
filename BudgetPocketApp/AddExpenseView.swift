import SwiftUI

struct AddExpenseView: View {
    @EnvironmentObject private var store: BudgetStore
    @Environment(\.dismiss) private var dismiss
    @State private var amount = ""
    @State private var category = BudgetConstants.categories[0]
    @State private var note = ""
    @State private var date = Date()

    var body: some View {
        NavigationStack {
            Form {
                Section("支出") {
                    TextField("金額", text: $amount).keyboardType(.numberPad)
                    Picker("カテゴリ", selection: $category) {
                        ForEach(BudgetConstants.categories, id: \.self) { Text($0) }
                    }
                    TextField("メモ（任意）", text: $note)
                    DatePicker("日付", selection: $date, displayedComponents: .date)
                }
            }
            .navigationTitle("支出を追加")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("キャンセル") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        guard let value = Int(amount), value > 0 else { return }
                        store.addExpense(amount: value, category: category, note: note, date: date)
                        dismiss()
                    }.disabled((Int(amount) ?? 0) <= 0)
                }
            }
        }
    }
}

struct BudgetEditorView: View {
    @EnvironmentObject private var store: BudgetStore
    @Environment(\.dismiss) private var dismiss
    @State private var amount = ""

    var body: some View {
        NavigationStack {
            Form {
                Section(BudgetConstants.monthTitle(for: store.selectedMonth)) {
                    TextField("月の予算", text: $amount).keyboardType(.numberPad)
                }
            }
            .navigationTitle("予算を設定")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear { amount = store.budget == 0 ? "" : String(store.budget) }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("キャンセル") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") { store.setBudget(Int(amount) ?? 0); dismiss() }
                }
            }
        }
    }
}
