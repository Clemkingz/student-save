"use client";

import { Suspense, useMemo, useState } from "react";
import { DashboardFrame } from "../_components/DashboardFrame";
import { MockReceipt } from "../_components/MockReceipt";
import { MoneyFlowChart } from "../_components/MoneyFlowChart";
import { isSuccessfulCredit, type MockTransaction } from "../_components/mockFinance";
import { createClient } from "@repo/supabase/browser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBudgets, useCommitments, useGoals, useLedger } from "../../../lib/queries/ledger";
import { useDashboardSession } from "../_components/useDashboardSession";
import styles from "../dashboard.module.css";

type Range = "month" | "30days" | "custom";
type ReportActivity = { id: string; title: string; detail: string; amount: number; date: string; kind: string; transaction?: MockTransaction };
type ReportAlert = { id: string; title: string; detail: string; receipt?: MockTransaction };

const kindLabels: Record<string, string> = {
  income: "Funds added",
  opening_balance: "Funds added",
  deposit: "Funds added",
  goal_withdrawal: "Savings returned",
  lock_collection: "Lock savings returned",
  transfer_reversal: "Reversal",
  expense: "Expense",
  withdrawal: "Withdrawal",
  goal_contribution: "Contribution",
  lock_deposit: "Lock savings",
  lock_fee: "Fee",
};
const fundKinds = ["income", "opening_balance", "deposit"];
const spendKinds = ["expense", "withdrawal", "lock_fee"];

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
  const { userId, email, ready } = useDashboardSession();
  const { data: ledger } = useLedger(ready ? userId : "");
  const { data: budgets = [] } = useBudgets(ready ? userId : "");
  const { data: goals = [] } = useGoals(ready ? userId : "");
  const { data: commitments = [] } = useCommitments(ready ? userId : "");
  const queryClient = useQueryClient();
  const { data: dismissed = [] } = useQuery({
    queryKey: ["report-dismissals", userId],
    enabled: Boolean(ready && userId),
    queryFn: async () => (await createClient().from("report_dismissals").select("alert_id")).data?.map((row) => row.alert_id) ?? [],
  });
  const [range, setRange] = useState<Range>("month");
  const today = ledger?.today ?? dateValue(new Date());
  const [chosenStart, setStartDate] = useState("");
  const [chosenEnd, setEndDate] = useState("");
  const startDate = chosenStart || `${today.slice(0, 7)}-01`;
  const endDate = chosenEnd || today;
  const [receiptTransaction, setReceiptTransaction] = useState<MockTransaction | null>(null);
  const transactions = useMemo(() => (ledger?.transactions ?? []).filter((item) => item.status !== "failed"), [ledger]);

  const bounds = useMemo(() => {
    if (range === "custom") return { start: startDate, end: endDate };
    if (range === "month") return { start: `${today.slice(0, 7)}-01`, end: today };
    const start = new Date(`${today}T12:00:00`);
    start.setDate(start.getDate() - 29);
    return { start: dateValue(start), end: today };
  }, [endDate, range, startDate, today]);

  const activities = useMemo<ReportActivity[]>(() => transactions
    .filter((item) => item.date >= bounds.start && item.date <= bounds.end)
    .map((item) => ({
      id: item.id,
      title: item.category,
      detail: `${item.status === "pending" ? "Pending · " : ""}${item.recipientName ? `to ${item.recipientName}${item.recipientBank ? `, ${item.recipientBank}` : ""}` : ""}${item.recipientName && item.note ? " · " : ""}${item.note}`,
      amount: item.amount,
      date: item.date,
      kind: kindLabels[item.kind] ?? item.kind,
      transaction: item,
    })), [bounds.end, bounds.start, transactions]);

  const income = activities.filter((item) => item.transaction && fundKinds.includes(item.transaction.kind)).reduce((sum, item) => sum + item.amount, 0);
  const expenses = activities.filter((item) => item.transaction && spendKinds.includes(item.transaction.kind)).reduce((sum, item) => sum + item.amount, 0);
  const spendByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    transactions.filter((item) => spendKinds.includes(item.kind) && item.date >= bounds.start && item.date <= bounds.end).forEach((item) => totals.set(item.category, (totals.get(item.category) || 0) + item.amount));
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
          income: weekTransactions.filter((item) => fundKinds.includes(item.kind)).reduce((sum, item) => sum + item.amount, 0),
          expense: weekTransactions.filter((item) => spendKinds.includes(item.kind)).reduce((sum, item) => sum + item.amount, 0),
        };
      });
    }
    const totals = new Map<string, { label: string; income: number; expense: number }>();
    transactions.filter((item) => item.date >= bounds.start && item.date <= bounds.end && [...fundKinds, ...spendKinds].includes(item.kind)).forEach((item) => {
      const key = item.date.slice(0, 7);
      const current = totals.get(key) || { label: new Date(`${key}-01T00:00:00`).toLocaleDateString("en", { month: "short", year: "2-digit" }), income: 0, expense: 0 };
      current[fundKinds.includes(item.kind) ? "income" : "expense"] += item.amount;
      totals.set(key, current);
    });
    return [...totals.values()].slice(-8);
  }, [bounds.end, bounds.start, transactions]);

  const alerts = useMemo<ReportAlert[]>(() => {
    const currentBudgets = budgets.filter((item) => item.month === today.slice(0, 7));
    const budgetAlerts = currentBudgets.flatMap((budget) => {
      const { spent } = budget;
      const percent = budget.amount > 0 ? spent / budget.amount * 100 : 0;
      return percent >= 80 ? [{ id: `budget-${budget.id}`, title: `${budget.category} budget at ${Math.floor(percent)}%`, detail: `${money(spent)} of ${money(budget.amount)} spent · ${money(Math.max(0, budget.amount - spent))} remaining${percent >= 100 ? " · over budget" : ""}` }] : [];
    });
    const goalAlerts = goals.flatMap((goal) => {
      const percent = goal.targetAmount > 0 ? goal.savedAmount / goal.targetAmount * 100 : 0;
      return percent > 0 ? [{ id: `goal-${goal.id}`, title: percent >= 100 ? `${goal.name} goal completed` : `${goal.name} goal at ${Math.floor(percent)}%`, detail: `${money(goal.savedAmount)} saved of ${money(goal.targetAmount)}` }] : [];
    });
    const lockAlerts = commitments.filter((lock) => !lock.withdrawnAt).flatMap((lock) => lock.endDate <= today ? [{ id: `lock-${lock.id}`, title: `${lock.description || "Lock savings"} term complete`, detail: `${money(lock.lockedAmount)} commitment reached its end date` }] : []);
    const receiptAlerts = transactions.filter((transaction) => transaction.receiptNumber && transaction.date >= bounds.start && transaction.date <= bounds.end).map((transaction) => ({
      id: `receipt-${transaction.id}`,
      title: transaction.type === "income" ? "Funds added receipt ready" : transaction.category === "Withdrawal" ? "Withdrawal receipt ready" : "Payment receipt ready",
      detail: `${transaction.receiptNumber} · ${dateLabel(transaction.date)}`,
      receipt: transaction,
    }));
    return [...receiptAlerts, ...budgetAlerts, ...goalAlerts, ...lockAlerts].filter((item) => !dismissed.includes(item.id));
  }, [bounds.end, bounds.start, budgets, commitments, dismissed, goals, today, transactions]);

  async function dismissAlert(id: string) {
    await createClient().from("report_dismissals").insert({ user_id: userId, alert_id: id });
    await queryClient.invalidateQueries({ queryKey: ["report-dismissals", userId] });
  }

  if (!ready || !ledger) return <main className={styles.mainContent} aria-live="polite">Loading reports…</main>;

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
        <article className={`${styles.statCard} ${styles.balanceCard}`}><p>Funds added</p><strong className={income > 0 && activities.filter(item => item.kind === "Funds added").every(item => item.transaction && isSuccessfulCredit(item.transaction)) ? "funds-added-amount" : undefined}>{income > 0 ? "+" : ""}{money(income)}</strong><small>{activities.filter((item) => item.kind === "Funds added").length} records</small></article>
        <article className={styles.statCard}><p>Expenses &amp; fees</p><strong>{money(expenses)}</strong><small>Money moved into savings is not counted</small></article>
        <article className={styles.statCard}><p>Net recorded</p><strong>{money(income - expenses)}</strong><small>{activities.length} activities tracked</small></article>
      </section>

      {topSpend && <section className={styles.topSpendCard} aria-label="Highest spending category"><div><span>Your top spending category</span><strong>{topSpend.category}</strong><small>{money(topSpend.amount)} recorded in this period</small></div><div className={styles.topSpendBadge}>Most spent</div></section>}

      <div className={styles.reportGrid}>
        <section className={`${styles.panel} ${styles.reportChartPanel}`}>
          <h2>Funds and expenses over time</h2>
          <p className={styles.budgetRemaining}>{bounds.start.slice(0, 7) === bounds.end.slice(0, 7) ? "Weekly totals for the selected month." : "Monthly totals for the selected date range."} Use the filters above to compare a different period.</p>
          <MoneyFlowChart highlightIncome={transactions.filter(item => fundKinds.includes(item.kind)).every(isSuccessfulCredit)} points={moneyFlow} ariaLabel="Monthly funds added and expenses for the selected report period" />
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
          {alerts.length ? <ul className={styles.reportAlerts}>{alerts.map((alert) => <li key={alert.id}><div><strong>{alert.title}</strong><span>{alert.receipt && <><b className={isSuccessfulCredit(alert.receipt) ? "funds-added-amount" : undefined}>{alert.receipt.type === "income" ? "+" : "−"}{money(alert.receipt.amount)}</b> · </>}{alert.detail}</span></div>{alert.receipt ? <button type="button" onClick={() => setReceiptTransaction(alert.receipt || null)}>View receipt</button> : <button type="button" onClick={() => dismissAlert(alert.id)}>Dismiss</button>}</li>)}</ul> : <p className={styles.emptyTransactions}>You’re all caught up. Budget, savings, and receipt alerts will appear here.</p>}
        </section>

        <section className={`${styles.panel} ${styles.reportActivityPanel}`}>
          <h2>Activity history</h2>
          {activities.length ? <ul className={styles.reportActivityList}>{activities.map((item) => <li key={item.id}><div><strong>{item.title}</strong><span>{item.kind} · {dateLabel(item.date)}{item.detail ? ` · ${item.detail}` : ""}{item.transaction?.receiptNumber ? ` · Receipt ${item.transaction.receiptNumber}` : ""}</span></div>{item.transaction?.receiptNumber && <button className={styles.reportReceiptButton} type="button" onClick={() => setReceiptTransaction(item.transaction || null)}>Receipt</button>}<b className={item.transaction && isSuccessfulCredit(item.transaction) ? "funds-added-amount" : undefined}>{item.kind === "Funds added" ? "+" : "−"}{money(item.amount)}</b></li>)}</ul> : <p className={styles.emptyTransactions}>No activity recorded in this date range.</p>}
        </section>
      </div>
      <p className={styles.disclaimer}>Reports use your simulated ledger, budgets, savings goals, and lock commitments.</p>
      {receiptTransaction && <MockReceipt transaction={receiptTransaction} onClose={() => setReceiptTransaction(null)} />}
    </DashboardFrame>
  );
}

export default function ReportsPage() {
  return <Suspense fallback={null}><ReportsContent /></Suspense>;
}
