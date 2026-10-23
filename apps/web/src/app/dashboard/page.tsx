"use client";

import { Suspense, useEffect, useState } from "react";
import { GoalWithdrawalButton } from "./_components/GoalWithdrawalButton";
import type { SavingsGoal as Goal } from "./_components/savingsAutomation";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { DashboardFrame } from "./_components/DashboardFrame";
import { MoneyFlowChart } from "./_components/MoneyFlowChart";
import { SchoolStatusBar } from "./_components/SchoolStatusBar";
import { getMockTransactions, type MockTransaction } from "./_components/mockFinance";
import { useDashboardSession } from "./_components/useDashboardSession";
import styles from "./dashboard.module.css";

type Budget = { id: string; category: string; amount: number; month: string };

function DashboardContent() {
  const { email, wallet, ready } = useDashboardSession();
  const [transactions, setTransactions] = useState<MockTransaction[] | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showBalances, setShowBalances] = useState(true);

  useEffect(() => {
    if (!ready || !email) return;
    const transactionsKey = `studentsave:transactions:${email}`;
    const refreshTransactions = () => setTransactions(getMockTransactions(email));
    const refreshSummaries = () => {
      try {
        const savedBudgets = JSON.parse(localStorage.getItem(`studentsave:budgets:${email}`) || "[]") as Budget[];
        setBudgets(Array.isArray(savedBudgets) ? savedBudgets : []);
      } catch { setBudgets([]); }
      try {
        const savedGoals = JSON.parse(localStorage.getItem(`studentsave:savings-goals:${email}`) || "[]") as Goal[];
        setGoals(Array.isArray(savedGoals) ? savedGoals : []);
      } catch { setGoals([]); }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === transactionsKey) refreshTransactions();
      if (event.key === `studentsave:budgets:${email}` || event.key === `studentsave:savings-goals:${email}`) refreshSummaries();
    };
    refreshTransactions();
    refreshSummaries();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [email, ready]);

  if (!ready || !wallet || !transactions) {
    return <main className={styles.mainContent} aria-live="polite">Loading your dashboard…</main>;
  }

  const fundsHref = `/dashboard/add-funds?email=${encodeURIComponent(email)}`;
  const totalIncome = transactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExpenses = transactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);
  const trackedBalance = Math.max(0, totalIncome - totalExpenses);
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthTransactions = transactions.filter((transaction) => transaction.date.startsWith(month));
  const monthIncome = monthTransactions.filter((transaction) => transaction.type === "income");
  const monthExpenses = monthTransactions.filter((transaction) => transaction.type === "expense");
  const monthIncomeTotal = monthIncome.reduce((sum, transaction) => sum + transaction.amount, 0);
  const monthExpenseTotal = monthExpenses.reduce((sum, transaction) => sum + transaction.amount, 0);
  const currentBudgets = budgets.filter((budget) => budget.month === month);
  const activeGoals = goals.filter((goal) => goal.targetAmount > 0 && goal.savedAmount < goal.targetAmount).slice(0, 3);
  const dashboardGoals = goals.filter((goal) => !goal.withdrawnAt).slice(0, 3);
  const budgetRows = currentBudgets.slice(0, 3).map((budget) => {
    const spent = monthExpenses.filter((transaction) => transaction.category === budget.category).reduce((sum, transaction) => sum + transaction.amount, 0);
    return { ...budget, spent, percent: Math.min(100, budget.amount > 0 ? spent / budget.amount * 100 : 0) };
  });
  const recentTransactions = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const money = (amount: number) => `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const displayMoney = (amount: number) => showBalances ? money(amount) : "••••••";
  const season = now.getMonth() >= 11 || now.getMonth() <= 1 ? "Wishing you a bright start to the year" : now.getMonth() >= 5 && now.getMonth() <= 7 ? "Hope your break is going well" : "Keep building healthy money habits";
  const ownerName = wallet.ownerName?.trim();
  const lastName = ownerName && !ownerName.includes("@") ? ownerName.split(/\s+/).at(-1) : "";
  const chartMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthItems = transactions.filter((item) => item.date.startsWith(key));
    return { label: date.toLocaleDateString("en", { month: "short" }), income: monthItems.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0), expenses: monthItems.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0) };
  });

  return (
    <DashboardFrame email={email} active="Dashboard">
      <header className={styles.pageHeading}>
        <h1>Dashboard</h1>
        <p>{season}. Your finances at a glance.</p>
      </header>

      <SchoolStatusBar />

      <section className={styles.accountCard} aria-label="Dashboard greeting and balance">
        <div className={styles.accountDetails}>
          <div><span className={styles.accountEyebrow}>Welcome to StudentSave</span><strong className={styles.accountName}>Hello{lastName ? ` ${lastName}` : ""}</strong></div>
          <div><span className={styles.accountNameLabel}>Available balance · {wallet.currency || "NGN"}</span><strong className={styles.accountBalance}>{displayMoney(trackedBalance)}</strong></div>
        </div>
        <button className={styles.balancePrivacyButton} type="button" onClick={() => setShowBalances((visible) => !visible)} aria-pressed={!showBalances} aria-label={showBalances ? "Hide all dashboard balances" : "Show all dashboard balances"}>{showBalances ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}{showBalances ? "Hide balances" : "Show balances"}</button>
      </section>

      <section className={styles.statGrid} aria-label="Monthly totals">
        <article className={`${styles.statCard} ${styles.balanceCard}`}>
          <p>Net this month</p>
          <strong>{displayMoney(monthIncomeTotal - monthExpenseTotal)}</strong>
          <small>All-time funds {displayMoney(totalIncome)} − expenses {displayMoney(totalExpenses)}</small>
        </article>
        <article className={styles.statCard}>
          <p>Income this month</p>
          <strong>{displayMoney(monthIncomeTotal)}</strong>
          <small>{monthIncome.length} {monthIncome.length === 1 ? "record" : "records"}</small>
        </article>
        <article className={styles.statCard}>
          <p>Expenses this month</p>
          <strong>{displayMoney(monthExpenseTotal)}</strong>
          <small>{monthExpenses.length} {monthExpenses.length === 1 ? "record" : "records"}</small>
        </article>
      </section>

      <div className={styles.actionRow}>
        <Link className={styles.primaryAction} href={fundsHref}>Add funds</Link>
        <Link className={styles.secondaryAction} href={`/dashboard/transactions?email=${encodeURIComponent(email)}`}>Add expense</Link>
      </div>

      <div className={styles.contentGrid}>
        <section className={`${styles.panel} ${styles.dashboardChart}`}>
          <h2>Funds and expenses · last 6 months</h2>
          <MoneyFlowChart points={chartMonths.map((item) => ({ label: item.label, income: item.income, expense: item.expenses }))} ariaLabel="Monthly funds added and expenses for the last six months" showValues={showBalances} />
        </section>
        <section className={styles.panel}>
          <h2>Recent activity</h2>
          {recentTransactions.length ? <ul className={styles.activityList}>
            {recentTransactions.map((transaction) => (
              <li className={styles.activityItem} key={transaction.id}>
                <div><strong>{transaction.category}</strong><span>{transaction.type === "income" ? "Funds added" : transaction.category === "Withdrawal" ? "Withdrawal" : "Expense"} · {new Date(`${transaction.date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></div>
                <b className={transaction.type === "income" ? styles.positive : undefined}>{transaction.type === "income" ? "+" : "−"}{displayMoney(transaction.amount)}</b>
              </li>
            ))}
          </ul> : <p className={styles.budgetRemaining}>Your recent funds and expenses will appear here.</p>}
        </section>

        <section className={styles.panel}>
          <div className={styles.dashboardPanelHeader}><div><h2>Budget summary</h2><p>{currentBudgets.length ? `${currentBudgets.length} active this month` : "No budgets set for this month"}</p></div><Link href={`/dashboard/budgets?email=${encodeURIComponent(email)}`}>Manage</Link></div>
          {budgetRows.length ? <div className={styles.dashboardMiniList}>{budgetRows.map((budget) => <div className={styles.dashboardMiniProgress} key={budget.id}><div className={styles.budgetHeading}><strong>{budget.category}</strong><span>{displayMoney(budget.spent)} / {displayMoney(budget.amount)}</span></div><div className={styles.progressTrack} role="progressbar" aria-label={`${budget.category} budget usage`} aria-valuenow={Math.round(budget.percent)} aria-valuemin={0} aria-valuemax={100}><div className={styles.progressBar} style={{ width: `${budget.percent}%` }} /></div></div>)}</div> : <p className={styles.budgetRemaining}>Create a monthly budget to track spending by category.</p>}
        </section>

        <section className={`${styles.panel} ${styles.savingsPanel}`}>
          <div className={styles.dashboardPanelHeader}><div><h2>Savings goals</h2><p>{activeGoals.length ? `${activeGoals.length} active goal${activeGoals.length === 1 ? "" : "s"}` : goals.length ? "All goals completed" : "Make progress toward a goal"}</p></div><Link href={`/dashboard/savings-goals?email=${encodeURIComponent(email)}`}>View all</Link></div>
          {dashboardGoals.length ? <div className={styles.dashboardMiniList}>{dashboardGoals.map((goal) => {
            const percent = Math.min(100, goal.savedAmount / goal.targetAmount * 100);
            return <div className={styles.dashboardMiniProgress} key={goal.id}><div className={styles.budgetHeading}><strong><Link href={`/dashboard/savings-goals/${encodeURIComponent(goal.id)}?email=${encodeURIComponent(email)}`}>{goal.name}</Link></strong><span>{Math.round(percent)}%</span></div><div className={styles.progressTrack} role="progressbar" aria-label={`${goal.name} savings goal progress`} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><div className={styles.progressBar} style={{ width: `${percent}%` }} /></div><small>{displayMoney(goal.savedAmount)} saved of {displayMoney(goal.targetAmount)}{goal.dueDate ? ` · due ${new Date(`${goal.dueDate}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}</small><GoalWithdrawalButton goal={goal} email={email} /></div>;
          })}</div> : <p className={styles.budgetRemaining}>Set a target and track your savings progress here.</p>}
        </section>
      </div>

      <p className={styles.disclaimer}>Tracked balance is based on the records you enter. It is not a bank balance.</p>
    </DashboardFrame>
  );
}

export default function DashboardPage() {
  return <Suspense fallback={null}><DashboardContent /></Suspense>;
}
