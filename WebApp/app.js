import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc, getFirestore, onSnapshot, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const STORAGE_KEY = "budget-pocket-web-v1";
const categories = ["食費", "日用品", "交通", "住居", "趣味", "交際費", "医療", "その他"];
const categoryIcons = { 食費: "🍙", 日用品: "🧴", 交通: "🚃", 住居: "🏠", 趣味: "🎧", 交際費: "☕", 医療: "＋", その他: "•••" };
const colors = ["#176bff", "#6c55d9", "#ef6b72", "#f0a443", "#29a886", "#43a6c6", "#a36d43", "#8b949f"];

let state = loadState();
let selectedMonth = new Date();
let cloud = { enabled: false, auth: null, db: null, user: null, ref: null, unsubscribe: null, ready: false, saveTimer: null };
let lastSyncError = "";
selectedMonth.setDate(1);

const $ = (id) => document.getElementById(id);
const currency = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const monthTitle = (date) => `${date.getFullYear()}年${date.getMonth() + 1}月`;
const todayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function isValidState(value) {
  return value && typeof value === "object" && value.budgets && typeof value.budgets === "object" && Array.isArray(value.expenses);
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidState(parsed)) return parsed;
  } catch (_) {}
  return { budgets: {}, expenses: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleCloudSave();
}

function scheduleCloudSave() {
  if (!cloud.enabled || !cloud.ready || !cloud.ref) return;
  clearTimeout(cloud.saveTimer);
  cloud.saveTimer = setTimeout(async () => {
    try {
      await setDoc(cloud.ref, { state, updatedAt: serverTimestamp() }, { merge: true });
      setSyncStatus("同期済み", "cloud");
    } catch (error) {
      setSyncError(error);
    }
  }, 350);
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

function setSyncStatus(text, mode = "") {
  const button = $("syncButton");
  button.textContent = text;
  button.title = lastSyncError || "";
  button.classList.toggle("cloud", mode === "cloud");
  button.classList.toggle("error", mode === "error");
}

function setSyncError(error) {
  console.error(error);
  lastSyncError = `${error.code || "unknown"}: ${error.message || error}`;
  setSyncStatus("同期失敗", "error");
}

function hasFirebaseConfig(config) {
  return Boolean(config?.apiKey && config?.authDomain && config?.projectId && config?.appId);
}

async function setupFirebase() {
  if (!hasFirebaseConfig(firebaseConfig)) {
    setSyncStatus("ローカル");
    return;
  }

  try {
    const app = initializeApp(firebaseConfig);
    cloud = { ...cloud, enabled: true, auth: getAuth(app), db: getFirestore(app) };
    setSyncStatus("ログイン");

    onAuthStateChanged(cloud.auth, async (user) => {
      cloud.user = user;
      cloud.ready = false;
      if (cloud.unsubscribe) cloud.unsubscribe();

      if (!user) {
        cloud.ref = null;
        setSyncStatus("ログイン");
        return;
      }

      setSyncStatus("同期中", "cloud");
      cloud.ref = doc(cloud.db, "users", user.uid, "apps", "budget-pocket");

      try {
        const snapshot = await getDoc(cloud.ref);
        if (snapshot.exists() && isValidState(snapshot.data().state)) {
          state = snapshot.data().state;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          render();
        } else {
          await setDoc(cloud.ref, { state, updatedAt: serverTimestamp() }, { merge: true });
        }

        cloud.ready = true;
        setSyncStatus("同期済み", "cloud");
        cloud.unsubscribe = onSnapshot(cloud.ref, (documentSnapshot) => {
          const remoteState = documentSnapshot.data()?.state;
          if (!isValidState(remoteState)) return;
          state = remoteState;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          render();
          setSyncStatus("同期済み", "cloud");
        });
      } catch (error) { setSyncError(error); }
    });
  } catch (error) {
    setSyncError(error);
  }
}

async function toggleSync() {
  if (lastSyncError) {
    alert(`Firebaseエラー:\n${lastSyncError}`);
    return;
  }
  if (!cloud.enabled) {
    alert("Firebase設定がまだ入っていません。firebase-config.js に設定値を入れると同期できます。");
    return;
  }
  if (cloud.user) {
    await signOut(cloud.auth);
    return;
  }
  try {
    setSyncStatus("ログイン中", "cloud");
    await signInWithPopup(cloud.auth, new GoogleAuthProvider());
  } catch (error) { setSyncError(error); }
}

$("expenseCategory").innerHTML = categories.map((category) => `<option>${category}</option>`).join("");
$("previousMonth").addEventListener("click", () => moveMonth(-1));
$("nextMonth").addEventListener("click", () => moveMonth(1));
$("currentMonth").addEventListener("click", () => { selectedMonth = new Date(); selectedMonth.setDate(1); render(); });
$("syncButton").addEventListener("click", toggleSync);
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
setupFirebase();
