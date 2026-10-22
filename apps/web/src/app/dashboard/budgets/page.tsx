"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { DashboardFrame } from "../_components/DashboardFrame";
import { getMockTransactions, type MockTransaction } from "../_components/mockFinance";
import { useDashboardSession } from "../_components/useDashboardSession";
import styles from "../dashboard.module.css";

type Budget = { id: string; category: string; amount: number; month: string; createdAt: string };
const categories = ["Food", "Transport", "Travelling", "Textbook", "Laptop", "Accommodation", "Utilities", "Healthcare", "Entertainment", "Data", "Other"];

function money(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function BudgetsContent() {
  const { email, ready } = useDashboardSession();
  const [transactions, setTransactions] = useState<MockTransaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const budgetKey = `studentsave:budgets:${email}`;
  const month = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (!ready || !email) return;
    const transactionsKey = `studentsave:transactions:${email}`;
    const refreshTransactions = () => setTransactions(getMockTransactions(email));
    const handleStorage = (event: StorageEvent) => { if (event.key === transactionsKey) refreshTransactions(); };
    refreshTransactions();
    window.addEventListener("storage", handleStorage);
    const saved = localStorage.getItem(budgetKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Budget[];
        setBudgets(Array.isArray(parsed) ? parsed : []);
      } catch {
        localStorage.removeItem(budgetKey);
        setBudgets([]);
      }
    } else {
      setBudgets([]);
    }
    return () => window.removeEventListener("storage", handleStorage);
  }, [budgetKey, email, ready]);

  const monthlyTransactions = useMemo(() => transactions.filter((transaction) => transaction.date.startsWith(month)), [month, transactions]);
  const totalIncome = transactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExpenses = transactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);
  const trackedBalance = Math.max(0, totalIncome - totalExpenses);
  const budgetCeiling = Math.min(totalIncome, trackedBalance);
  const currentBudgets = budgets.filter((budget) => budget.month === month);
  const totalBudgeted = currentBudgets.reduce((sum, budget) => sum + budget.amount, 0);
  const remainingToBudget = Math.max(0, budgetCeiling - totalBudgeted);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category) {
      setError("Choose an expense category.");
      setNotice("");
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a budget amount greater than zero.");
      setNotice("");
      return;
    }
    const roundedAmount = Math.round(numericAmount * 100) / 100;
    if (currentBudgets.some((budget) => budget.category === category)) {
      setError(`A ${category.toLowerCase()} budget already exists for this month.`);
      setNotice("");
      return;
    }
    if (Math.round((totalBudgeted + roundedAmount) * 100) > Math.round(budgetCeiling * 100)) {
      setError(`This exceeds your available budget. You can allocate up to ${money(remainingToBudget)} more.`);
      setNotice("");
      return;
    }

    const newBudget: Budget = { id: crypto.randomUUID(), category, amount: roundedAmount, month, createdAt: new Date().toISOString() };
    const nextBudgets = [...budgets, newBudget];
    localStorage.setItem(budgetKey, JSON.stringify(nextBudgets));
    setBudgets(nextBudgets);
    setAmount("");
    setError("");
    setNotice(`${category} budget created.`);
    setShowForm(false);
  }

  if (!ready) return <main className={styles.mainContent} aria-live="polite">Loading budgets…</main>;

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long" });

  return (
    <DashboardFrame email={email} active="Budget/expenses">
      <header className={styles.pageHeading}>
        <h1>Budget/expenses</h1>
        <p>Plan spending by category and period.</p>
      </header>

      <section className={styles.budgetOverview} aria-label="Available budget">
        <div><span>Total income</span><strong>{money(totalIncome)}</strong></div>
        <div><span>Tracked balance</span><strong>{money(trackedBalance)}</strong></div>
        <div><span>Available to budget</span><strong>{money(remainingToBudget)}</strong></div>
      </section>

      {budgetCeiling === 0 && <p className={styles.budgetLimitHint}>No budgetable balance is available. <Link className={styles.budgetHintLink} href={`/dashboard/transactions?email=${encodeURIComponent(email)}`}>Record income or update your transactions</Link> before creating a budget.</p>}

      <button className={styles.createBudgetButton} type="button" disabled={remainingToBudget <= 0 && !showForm} onClick={() => { if (!showForm) setCategory(categories.find((item) => !currentBudgets.some((budget) => budget.category === item)) || categories[0]); setShowForm((visible) => !visible); setError(""); setNotice(""); }}>
        {showForm ? "Close budget form" : "Create budget"}
      </button>

      {showForm && (
        <form className={`${styles.panel} ${styles.budgetForm}`} onSubmit={handleSubmit} noValidate>
          <h2>Create a monthly budget</h2>
          <div className={styles.budgetFormFields}>
            <div className={styles.transactionField}>
              <label htmlFor="budgetCategory">Expense category</label>
              <select id="budgetCategory" value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.filter((item) => !currentBudgets.some((budget) => budget.category === item)).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className={styles.transactionField}>
              <label htmlFor="budgetAmount">Budget amount</label>
              <div className={styles.transactionAmount}><span aria-hidden="true">₦</span><input id="budgetAmount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); setNotice(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? "budgetAmount-error" : undefined} /></div>
            </div>
          </div>
          <p className={styles.budgetLimitHint}>Your total monthly budgets can’t exceed {money(budgetCeiling)} (the lower of your income and tracked balance). {money(remainingToBudget)} remains available.</p>
          {error && <p className={styles.budgetError} id="budgetAmount-error" role="alert">{error}</p>}
          <button className={styles.primaryAction} type="submit">Save budget</button>
        </form>
      )}

      {notice && <p className={styles.budgetNotice} role="status">{notice}</p>}

      <section className={styles.panel + " " + styles.monthBudgetPanel}>
        <h2>{monthLabel} budgets</h2>
        {currentBudgets.length ? (
          <div className={styles.budgetList}>
            {currentBudgets.map((budget) => {
              const spent = monthlyTransactions.filter((transaction) => transaction.type === "expense" && transaction.category === budget.category).reduce((sum, transaction) => sum + transaction.amount, 0);
              const percent = Math.min(100, (spent / budget.amount) * 100);
              const remaining = budget.amount - spent;
              return (
                <div key={budget.id}>
                  <div className={styles.budgetHeading}><span>{budget.category}</span><span>{money(spent)} of {money(budget.amount)}</span></div>
                  <div className={styles.progressTrack}><div className={percent >= 80 ? styles.progressBarWarm : styles.progressBar} style={{ width: `${percent}%` }} /></div>
                  <p className={styles.budgetRemaining}>{remaining < 0 ? `${money(Math.abs(remaining))} above plan.` : `${money(remaining)} remaining`}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyTransactions}>No budgets yet. Create one from your available income and tracked balance.</p>
        )}
      </section>

      <p className={styles.disclaimer}>Alerts appear at 80% and 100% of a budget. You can still record spending above a limit.</p>
    </DashboardFrame>
  );
}

export default function BudgetsPage() {
  return <Suspense fallback={null}><BudgetsContent /></Suspense>;
}
