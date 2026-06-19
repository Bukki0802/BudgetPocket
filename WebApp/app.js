const STORAGE_KEY = "budget-pocket-web-v1";
const categories = ["食費", "日用品", "交通", "住居", "趣味", "交際費", "医療", "その他"];
const categoryIcons = { 食費: "🍙", 日用品: "🧴", 交通: "🚃", 住居: "🏠", 趣味: "🎧", 交際費: "☕", 医療: "＋", その他: "•••" };
const colors = ["#176bff", "#6c55d9", "#ef6b72", "#f0a443", "#29a886", "#43a6c6", "#a36d43", "#8b949f"];

let state = loadState();
let selectedMonth = new Date();
selectedMonth.setDate(1);

const $ = (id) => document.getElementById(id);
const currency = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const monthTitle = (date) => `${date.getFullYear()}年${date.getMonth() + 1}月`;
const todayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && parsed.budgets && Array.isArray(parsed.expenses)) return parsed;
  } catch (_) {}
  return { budgets: {}, expenses: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function expensesForSelectedMonth() {
  const key = monthKey(selectedMonth);
  return state.expenses
    .filter((expense) => expense.date.startsWith(key))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function render() {
  const key = monthKey(selectedMonth);
  const budget = Number(state.budgets[key] || 0);
  const expenses = expensesForSelectedMonth();
  const spent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = budget - spent;
  const ratio = budget > 0 ? Math.min(spent / budget, 1) : 0;

  $("currentMonth").textContent = monthTitle(selectedMonth);
  $("remainingAmount").textContent = currency.format(remaining);
  $("remainingAmount").classList.toggle("over", remaining < 0);
  $("spentAmount").textContent = currency.format(spent);
  $("budgetAmount").textContent = currency.format(budget);
  $("progressBar").style.width = `${ratio * 100}%`;
  $("progressBar").classList.toggle("over", remaining < 0);
  $("expenseCount").textContent = `${expenses.length}件`;

  renderCategories(expenses, spent);
  renderExpenses(expenses);
}

function renderCategories(expenses, spent) {
  const totals = categories
    .map((name) => ({ name, amount: expenses.filter((item) => item.category === name).reduce((sum, item) => sum + item.amount, 0) }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  $("categoryCard").hidden = totals.length === 0;
  if (!totals.length) return;

  let degrees = 0;
  const stops = totals.map((item) => {
    const index = categories.indexOf(item.name);
    const start = degrees;
    degrees += (item.amount / spent) * 360;
    return `${colors[index]} ${start}deg ${degrees}deg`;
  });
  $("categoryDonut").style.background = `conic-gradient(${stops.join(",")})`;
  $("donutTotal").textContent = currency.format(spent);
  $("categoryLegend").innerHTML = totals.slice(0, 5).map((item) => {
    const index = categories.indexOf(item.name);
    return `<div class="legend-item"><span class="dot" style="background:${colors[index]}"></span><span class="legend-name">${item.name} ${Math.round(item.amount / spent * 100)}%</span></div>`;
  }).join("");
  $("categoryList").innerHTML = totals.map((item) => `<div class="category-row"><span>${escapeHTML(item.name)}</span><strong>${currency.format(item.amount)}</strong></div>`).join("");
}

function renderExpenses(expenses) {
  $("emptyState").hidden = expenses.length > 0;
  $("expenseList").innerHTML = expenses.map((expense) => {
    const safeCategory = escapeHTML(expense.category);
    const subtitle = expense.note ? `${formatDate(expense.date)} · ${escapeHTML(expense.note)}` : formatDate(expense.date);
    return `<article class="expense-row">
      <div class="category-icon">${categoryIcons[expense.category] || "•"}</div>
      <div class="expense-info"><strong>${safeCategory}</strong><span>${subtitle}</span></div>
      <div class="expense-value">${currency.format(expense.amount)}</div>
      <button class="delete-button" data-delete="${expense.id}" aria-label="支出を削除">×</button>
    </article>`;
  }).join("");
}

function formatDate(dateString) {
  const [, month, day] = dateString.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function moveMonth(offset) {
  selectedMonth.setMonth(selectedMonth.getMonth() + offset);
  render();
}

$("expenseCategory").innerHTML = categories.map((category) => `<option>${category}</option>`).join("");
$("previousMonth").addEventListener("click", () => moveMonth(-1));
$("nextMonth").addEventListener("click", () => moveMonth(1));
$("currentMonth").addEventListener("click", () => { selectedMonth = new Date(); selectedMonth.setDate(1); render(); });
$("addExpenseButton").addEventListener("click", () => {
  $("expenseForm").reset();
  $("expenseDate").value = monthKey(selectedMonth) === monthKey(new Date()) ? todayString() : `${monthKey(selectedMonth)}-01`;
  $("expenseDialog").showModal();
  setTimeout(() => $("expenseAmount").focus(), 100);
});
$("editBudgetButton").addEventListener("click", () => {
  $("budgetDialogMonth").textContent = monthTitle(selectedMonth);
  $("budgetInput").value = state.budgets[monthKey(selectedMonth)] || "";
  $("budgetDialog").showModal();
  setTimeout(() => $("budgetInput").focus(), 100);
});
$("installHelpButton").addEventListener("click", () => $("installDialog").showModal());

$("expenseForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number($("expenseAmount").value);
  if (!Number.isFinite(amount) || amount <= 0) return;
  state.expenses.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    amount: Math.round(amount),
    category: $("expenseCategory").value,
    date: $("expenseDate").value,
    note: $("expenseNote").value.trim(),
    createdAt: Date.now()
  });
  saveState();
  $("expenseDialog").close();
  render();
});

$("budgetForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.budgets[monthKey(selectedMonth)] = Math.max(0, Math.round(Number($("budgetInput").value) || 0));
  saveState();
  $("budgetDialog").close();
  render();
});

$("expenseList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button || !confirm("この支出を削除しますか？")) return;
  state.expenses = state.expenses.filter((expense) => expense.id !== button.dataset.delete);
  saveState();
  render();
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => $(button.dataset.close).close());
});
document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
});

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js"));
render();
