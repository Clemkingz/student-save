"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { DashboardFrame } from "../_components/DashboardFrame";
import { MockReceipt } from "../_components/MockReceipt";
import { MoneyFlowChart } from "../_components/MoneyFlowChart";
import { getMockTransactions, type MockTransaction } from "../_components/mockFinance";
import { useDashboardSession } from "../_components/useDashboardSession";
import styles from "../dashboard.module.css";

type Range = "month" | "30days" | "custom";
type Budget = { id: string; category: string; amount: number; month: string; createdAt: string };
type Goal = { id: string; name: string; targetAmount: number; savedAmount: number; createdAt: string; dueDate: string };
type Contribution = { id: string; goalId: string; amount: number; frequency: string; date: string; createdAt: string; transactionId?: string };
type Commitment = { id: string; planMonths: number; targetAmount: number; lockedAmount: number; startDate: string; endDate: string; description: string; createdAt: string };
type ReportActivity = { id: string; title: string; detail: string; amount: number; date: string; kind: string; transaction?: MockTransaction };
type ReportAlert = { id: string; title: string; detail: string; receipt?: MockTransaction };

const keys = {
  budgets: "studentsave:budgets:",
  goals: "studentsave:savings-goals:",
  contributions: "studentsave:savings-contributions:",
  locks: "studentsave:lock-commitments:",
};

function readList<T>(key: string): T[] {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function money(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function dateValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function dateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ReportsContent() {
  const { email, ready } = useDashboardSession();
  const [transactions, setTransactions] = useState<MockTransaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [range, setRange] = useState<Range>("month");
  const [startDate, setStartDate] = useState(() => dateValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [endDate, setEndDate] = useState(() => dateValue(new Date()));
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [receiptTransaction, setReceiptTransaction] = useState<MockTransaction | null>(null);

  useEffect(() => {
    if (!ready || !email) return;
    const transactionsKey = `studentsave:transactions:${email}`;
    const refreshTransactions = () => {
      setTransactions(getMockTransactions(email));
      setGoals(readList<Goal>(`${keys.goals}${email}`));
      setContributions(readList<Contribution>(`${keys.contributions}${email}`));
      setCommitments(readList<Commitment>(`${keys.locks}${email}`));
    };
    const handleStorage = (event: StorageEvent) => { if (event.key === transactionsKey || event.key === `${keys.goals}${email}` || event.key === `${keys.contributions}${email}` || event.key === `${keys.locks}${email}`) refreshTransactions(); };
    refreshTransactions();
    window.addEventListener("storage", handleStorage);
    setBudgets(readList<Budget>(`${keys.budgets}${email}`));
    setGoals(readList<Goal>(`${keys.goals}${email}`));
    setContributions(readList<Contribution>(`${keys.contributions}${email}`));
    setCommitments(readList<Commitment>(`${keys.locks}${email}`));
    setDismissed(readList<string>(`studentsave:reports-dismissed:${email}`));
    return () => window.removeEventListener("storage", handleStorage);
  }, [email, ready]);

  const bounds = useMemo(() => {
    const end = new Date();
    const start = new Date();
    if (range === "month") start.setDate(1);
    else if (range === "30days") start.setDate(start.getDate() - 29);
    else {
      const customStart = new Date(`${startDate}T00:00:00`);
      const customEnd = new Date(`${endDate}T00:00:00`);
      if (!Number.isNaN(customStart.getTime())) start.setTime(customStart.getTime());
      if (!Number.isNaN(customEnd.getTime())) end.setTime(customEnd.getTime());
    }
    return { start: dateValue(start), end: dateValue(end) };
  }, [endDate, range, startDate]);

  const activities = useMemo<ReportActivity[]>(() => {
    const items: ReportActivity[] = transactions.map((item) => ({
      id: `transaction-${item.id}`,
      title: item.category,
      detail: `${item.type === "income" ? "Funds added" : item.category === "Withdrawal" ? "Withdrawal" : item.category === "Lock Savings" ? "Locked into commitment" : "Expense"}${item.recipientName ? ` · to ${item.recipientName}${item.recipientBank ? `, ${item.recipientBank}` : ""}` : ""}${item.note ? ` · ${item.note}` : ""}`,
      amount: item.amount,
      date: item.date,
      kind: item.type === "income" ? "Funds added" : item.category === "Withdrawal" ? "Withdrawal" : item.category === "Lock Savings" ? "Lock savings" : "Expense",
      transaction: item,
    }));
    budgets.forEach((item) => items.push({ id: `budget-${item.id}`, title: `${item.category} budget`, detail: `Budget created · ${item.month}`, amount: item.amount, date: item.createdAt?.slice(0, 10) || `${item.month}-01`, kind: "Budget" }));
    goals.forEach((item) => items.push({ id: `goal-${item.id}`, title: item.name, detail: `Savings goal created${item.dueDate ? ` · due ${dateLabel(item.dueDate)}` : ""}`, amount: item.targetAmount, date: item.createdAt?.slice(0, 10) || dateValue(new Date()), kind: "Savings goal" }));
    contributions.forEach((item) => {
      if (transactions.some(transaction => transaction.id === item.transactionId || transaction.id === `savings-contribution:${item.id}`)) return;
      const goalName = goals.find((goal) => goal.id === item.goalId)?.name || "Savings goal";
      items.push({ id: `contribution-${item.id}`, title: goalName, detail: `${item.frequency} contribution recorded`, amount: item.amount, date: item.date || item.createdAt?.slice(0, 10) || dateValue(new Date()), kind: "Contribution" });
    });
    commitments.forEach((item) => items.push({ id: `lock-${item.id}`, title: item.description || `${item.planMonths}-month lock`, detail: `${item.planMonths}-month commitment · ends ${dateLabel(item.endDate)}`, amount: item.lockedAmount, date: item.createdAt?.slice(0, 10) || item.startDate, kind: "Lock savings" }));
    return items.filter((item) => item.date >= bounds.start && item.date <= bounds.end).sort((a, b) => b.date.localeCompare(a.date));
  }, [bounds.end, bounds.start, budgets, commitments, contributions, goals, transactions]);

  const income = activities.filter((item) => item.kind === "Funds added").reduce((sum, item) => sum + item.amount, 0);
  const expenses = activities.filter((item) => item.kind === "Expense" || item.kind === "Withdrawal" || item.kind === "Lock savings" && item.id.startsWith("transaction-")).reduce((sum, item) => sum + item.amount, 0);
  const spendByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    transactions.filter((item) => item.type === "expense" && item.date >= bounds.start && item.date <= bounds.end).forEach((item) => totals.set(item.category, (totals.get(item.category) || 0) + item.amount));
    return [...totals].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  }, [bounds.end, bounds.start, transactions]);
  const categorizedSpend = spendByCategory.reduce((sum, item) => sum + item.amount, 0);
  const topSpend = spendByCategory[0];
  const moneyFlow = useMemo(() => {
    if (bounds.start.slice(0, 7) === bounds.end.slice(0, 7)) {
      const monthPrefix = bounds.start.slice(0, 7);
      const endOfMonth = new Date(Number(monthPrefix.slice(0, 4)), Number(monthPrefix.slice(5, 7)), 0).getDate();
      return Array.from({ length: 5 }, (_, index) => {
        const firstDay = index * 7 + 1;
        const lastDay = Math.min(firstDay + 6, endOfMonth);
        const weekTransactions = transactions.filter((item) => item.date >= bounds.start && item.date <= bounds.end && item.date.startsWith(monthPrefix) && Number(item.date.slice(8, 10)) >= firstDay && Number(item.date.slice(8, 10)) <= lastDay);
        return {
          label: `${firstDay}–${lastDay}`,
          income: weekTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0),
          expense: weekTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0),
        };
      });
    }
    const totals = new Map<string, { label: string; income: number; expense: number }>();
    transactions.filter((item) => item.date >= bounds.start && item.date <= bounds.end).forEach((item) => {
      const key = item.date.slice(0, 7);
      const current = totals.get(key) || { label: new Date(`${key}-01T00:00:00`).toLocaleDateString("en", { month: "short", year: "2-digit" }), income: 0, expense: 0 };
      current[item.type === "income" ? "income" : "expense"] += item.amount;
      totals.set(key, current);
    });
    return [...totals.values()].slice(-8);
  }, [bounds.end, bounds.start, transactions]);

  const alerts = useMemo<ReportAlert[]>(() => {
    const activeMonth = dateValue(new Date()).slice(0, 7);
    const currentBudgets = budgets.filter((item) => item.month === activeMonth);
    const budgetAlerts = currentBudgets.flatMap((budget) => {
      const spent = transactions.filter((item) => item.type === "expense" && item.category === budget.category && item.date.startsWith(activeMonth)).reduce((sum, item) => sum + item.amount, 0);
      const percent = budget.amount > 0 ? spent / budget.amount * 100 : 0;
      return percent >= 80 ? [{ id: `budget-${budget.id}`, title: `${budget.category} budget at ${Math.floor(percent)}%`, detail: `${money(spent)} of ${money(budget.amount)} spent · ${money(Math.max(0, budget.amount - spent))} remaining${percent >= 100 ? " · over budget" : ""}` }] : [];
    });
    const goalAlerts = goals.flatMap((goal) => {
      const percent = goal.targetAmount > 0 ? goal.savedAmount / goal.targetAmount * 100 : 0;
      return percent > 0 ? [{ id: `goal-${goal.id}`, title: percent >= 100 ? `${goal.name} goal completed` : `${goal.name} goal at ${Math.floor(percent)}%`, detail: `${money(goal.savedAmount)} saved of ${money(goal.targetAmount)}` }] : [];
    });
    const lockAlerts = commitments.flatMap((lock) => lock.endDate <= dateValue(new Date()) ? [{ id: `lock-${lock.id}`, title: `${lock.description || "Lock savings"} term complete`, detail: `${money(lock.lockedAmount)} commitment reached its end date` }] : []);
    const receiptAlerts = transactions.filter((transaction) => transaction.receiptNumber && transaction.date >= bounds.start && transaction.date <= bounds.end).map((transaction) => ({
      id: `receipt-${transaction.id}`,
      title: transaction.type === "income" ? "Funds added receipt ready" : transaction.category === "Withdrawal" ? "Withdrawal receipt ready" : "Payment receipt ready",
      detail: `${money(transaction.amount)} · ${transaction.receiptNumber} · ${dateLabel(transaction.date)}`,
      receipt: transaction,
    }));
    return [...receiptAlerts, ...budgetAlerts, ...goalAlerts, ...lockAlerts].filter((item) => !dismissed.includes(item.id));
  }, [bounds.end, bounds.start, budgets, commitments, dismissed, goals, transactions]);

  function dismissAlert(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(`studentsave:reports-dismissed:${email}`, JSON.stringify(next));
  }

  if (!ready) return <main className={styles.mainContent} aria-live="polite">Loading reports…</main>;

  return (
    <DashboardFrame email={email} active="Reports & Alerts">
      <header className={styles.pageHeading}>
        <h1>Reports &amp; alerts</h1>
        <p>Understand patterns across your recorded money activity.</p>
      </header>

      <div className={styles.reportFilters} role="group" aria-label="Report date range">
        <button type="button" className={range === "month" ? styles.reportFilterActive : styles.reportFilter} aria-pressed={range === "month"} onClick={() => setRange("month")}>This month</button>
        <button type="button" className={range === "30days" ? styles.reportFilterActive : styles.reportFilter} aria-pressed={range === "30days"} onClick={() => setRange("30days")}>Last 30 days</button>
        <button type="button" className={range === "custom" ? styles.reportFilterActive : styles.reportFilter} aria-pressed={range === "custom"} onClick={() => setRange("custom")}>Custom</button>
        {range === "custom" && <div className={styles.reportDateRange}><label>From <input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>To <input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>}
      </div>

      <section className={styles.reportStats} aria-label="Activity totals for selected period">
        <article className={`${styles.statCard} ${styles.balanceCard}`}><p>Funds added</p><strong>{money(income)}</strong><small>{activities.filter((item) => item.kind === "Funds added").length} records</small></article>
        <article className={styles.statCard}><p>Expenses &amp; locks</p><strong>{money(expenses)}</strong><small>Includes wallet deductions</small></article>
        <article className={styles.statCard}><p>Net recorded</p><strong>{money(income - expenses)}</strong><small>{activities.length} activities tracked</small></article>
      </section>

      {topSpend && <section className={styles.topSpendCard} aria-label="Highest spending category"><div><span>Your top spending category</span><strong>{topSpend.category}</strong><small>{money(topSpend.amount)} recorded in this period</small></div><div className={styles.topSpendBadge}>Most spent</div></section>}

      <div className={styles.reportGrid}>
        <section className={`${styles.panel} ${styles.reportChartPanel}`}>
          <h2>Funds and expenses over time</h2>
          <p className={styles.budgetRemaining}>{bounds.start.slice(0, 7) === bounds.end.slice(0, 7) ? "Weekly totals for the selected month." : "Monthly totals for the selected date range."} Use the filters above to compare a different period.</p>
          <MoneyFlowChart points={moneyFlow} ariaLabel="Monthly funds added and expenses for the selected report period" />
          {moneyFlow.length > 0 && <ul className={styles.reportFlowDetails}>{moneyFlow.map((item) => <li key={`detail-${item.label}`}><span>{item.label}</span><span>Funds {money(item.income)}</span><span>Expenses {money(item.expense)}</span><strong>Net {money(item.income - item.expense)}</strong></li>)}</ul>}
        </section>
        <section className={styles.panel}>
          <h2>Spending by category</h2>
          {spendByCategory.length ? <div className={styles.reportCategoryList}>{spendByCategory.map((item) => {
            const share = categorizedSpend > 0 ? item.amount / categorizedSpend * 100 : 0;
            return <article className={styles.reportCategory} key={item.category}><div className={styles.reportCategoryHeading}><strong>{item.category}</strong><span>{money(item.amount)}</span></div><div className={styles.progressTrack} role="progressbar" aria-label={`${item.category}, ${Math.round(share)} percent of spending`} aria-valuenow={Math.round(share)} aria-valuemin={0} aria-valuemax={100}><div className={styles.progressBar} style={{ width: `${Math.max(share, 1)}%` }} /></div><small>{Math.round(share)}% of expenses</small></article>;
          })}</div> : <p className={styles.emptyTransactions}>No expenses recorded for this period yet.</p>}
        </section>

        <section className={styles.panel}>
          <h2>Alerts</h2>
          {alerts.length ? <ul className={styles.reportAlerts}>{alerts.map((alert) => <li key={alert.id}><div><strong>{alert.title}</strong><span>{alert.detail}</span></div>{alert.receipt ? <button type="button" onClick={() => setReceiptTransaction(alert.receipt || null)}>View receipt</button> : <button type="button" onClick={() => dismissAlert(alert.id)}>Dismiss</button>}</li>)}</ul> : <p className={styles.emptyTransactions}>You’re all caught up. Budget, savings, and receipt alerts will appear here.</p>}
        </section>

        <section className={`${styles.panel} ${styles.reportActivityPanel}`}>
          <h2>Activity history</h2>
          {activities.length ? <ul className={styles.reportActivityList}>{activities.map((item) => <li key={item.id}><div><strong>{item.title}</strong><span>{item.kind} · {dateLabel(item.date)}{item.detail ? ` · ${item.detail}` : ""}{item.transaction?.receiptNumber ? ` · Receipt ${item.transaction.receiptNumber}` : ""}</span></div>{item.transaction?.receiptNumber && <button className={styles.reportReceiptButton} type="button" onClick={() => setReceiptTransaction(item.transaction || null)}>Receipt</button>}<b>{item.kind === "Funds added" ? "+" : "−"}{money(item.amount)}</b></li>)}</ul> : <p className={styles.emptyTransactions}>No activity recorded in this date range.</p>}
        </section>
      </div>
      <p className={styles.disclaimer}>Reports use your saved mock transactions, budgets, savings goals, contributions, and lock commitments on this device.</p>
      {receiptTransaction && <MockReceipt transaction={receiptTransaction} onClose={() => setReceiptTransaction(null)} />}
    </DashboardFrame>
  );
}

export default function ReportsPage() {
  return <Suspense fallback={null}><ReportsContent /></Suspense>;
}
