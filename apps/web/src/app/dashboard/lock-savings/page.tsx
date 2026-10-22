"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { DashboardFrame } from "../_components/DashboardFrame";
import { TransactionSuccessPopup } from "../_components/TransactionSuccessPopup";
import { getMockTransactions, localDateValue, type MockTransaction } from "../_components/mockFinance";
import { verifyTransactionPin } from "../_components/transactionPin";
import { useDashboardSession } from "../_components/useDashboardSession";
import styles from "../dashboard.module.css";

type Commitment = {
  id: string;
  planMonths: number;
  targetAmount: number;
  lockedAmount: number;
  startDate: string;
  endDate: string;
  description: string;
  createdAt: string;
  withdrawnAt?: string;
};

const lockPlans = [1, 2, 3, 6, 12];

function addMonths(dateValue: string, months: number) {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  const originalDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(originalDay, lastDay));
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function money(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function readableDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getTermProgress(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100));
}

function LockSavingsContent() {
  const { email, ready } = useDashboardSession();
  const storageKey = `studentsave:lock-commitments:${email}`;
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [planMonths, setPlanMonths] = useState(1);
  const [targetAmount, setTargetAmount] = useState("");
  const [startDate, setStartDate] = useState(localDateValue());
  const [description, setDescription] = useState("");
  const [transactionPin, setTransactionPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [successToast, setSuccessToast] = useState<{ id: string; message: string } | null>(null);
  const endDate = addMonths(startDate, planMonths);

  useEffect(() => {
    if (!ready || !email) return;
    const transactions = getMockTransactions(email);
    const income = transactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = transactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);
    setWalletBalance(Math.max(0, income - expenses));

    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Commitment[];
      setCommitments(Array.isArray(parsed) ? parsed : []);
    } catch {
      localStorage.removeItem(storageKey);
      setCommitments([]);
    }
  }, [email, ready, storageKey]);

  const totalTarget = commitments.reduce((sum, commitment) => sum + commitment.targetAmount, 0);
  const totalLocked = commitments.reduce((sum, commitment) => sum + (commitment.withdrawnAt ? 0 : commitment.lockedAmount), 0);

  function withdrawCommitment(commitmentId: string) {
    const commitment = commitments.find((item) => item.id === commitmentId);
    if (!commitment || commitment.withdrawnAt) return;
    if (localDateValue() < commitment.endDate) return;

    const transactions = getMockTransactions(email);
    const withdrawal: MockTransaction = {
      id: crypto.randomUUID(),
      type: "income",
      amount: commitment.lockedAmount,
      category: "Lock Savings Withdrawal",
      date: localDateValue(),
      note: commitment.description || `${commitment.planMonths}-month lock savings matured`,
    };
    const updatedCommitments = commitments.map((item) => item.id === commitmentId ? { ...item, withdrawnAt: new Date().toISOString() } : item);
    localStorage.setItem(`studentsave:transactions:${email}`, JSON.stringify([withdrawal, ...transactions]));
    localStorage.setItem(storageKey, JSON.stringify(updatedCommitments));
    setCommitments(updatedCommitments);
    setWalletBalance((balance) => balance + commitment.lockedAmount);
    setNotice(`${money(commitment.lockedAmount)} withdrawn to your available balance.`);
    setSuccessToast({ id: crypto.randomUUID(), message: "Lock savings withdrawn!" });
    setError("");
  }

  async function createCommitment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = Number(targetAmount);
    if (!Number.isFinite(target) || target <= 0) {
      setError("Enter an amount greater than zero.");
      setNotice("");
      return;
    }
    if (startDate < localDateValue()) {
      setError("Choose today or a future start date.");
      setNotice("");
      return;
    }
    const roundedTarget = Math.round(target * 100) / 100;
    const transactions = getMockTransactions(email);
    const income = transactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = transactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);
    const currentBalance = Math.max(0, income - expenses);
    if (Math.round(roundedTarget * 100) > Math.round(currentBalance * 100)) {
      setError(`Your tracked wallet balance is ${money(currentBalance)}. Lower the commitment amount to continue.`);
      setNotice("");
      return;
    }
    if (!startDate) {
      setError("Choose a start date.");
      setNotice("");
      return;
    }
    if (!/^\d{4}$/.test(transactionPin)) {
      setError("Enter your 4-digit transaction PIN to lock these funds.");
      setNotice("");
      return;
    }
    if (!(await verifyTransactionPin(email, transactionPin))) {
      setError("That transaction PIN is incorrect.");
      setNotice("");
      return;
    }

    const commitment: Commitment = {
      id: crypto.randomUUID(),
      planMonths,
      targetAmount: roundedTarget,
      lockedAmount: roundedTarget,
      startDate,
      endDate,
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };
    const lockTransaction: MockTransaction = {
      id: crypto.randomUUID(),
      type: "expense",
      amount: roundedTarget,
      category: "Lock Savings",
      date: localDateValue(),
      note: description.trim() || `${planMonths}-month lock savings commitment`,
    };
    const nextCommitments = [commitment, ...commitments];
    localStorage.setItem(`studentsave:transactions:${email}`, JSON.stringify([lockTransaction, ...transactions]));
    localStorage.setItem(storageKey, JSON.stringify(nextCommitments));
    setWalletBalance(currentBalance - roundedTarget);
    setCommitments(nextCommitments);
    setTargetAmount("");
    setDescription("");
    setTransactionPin("");
    setError("");
    setNotice(`${money(roundedTarget)} locked until ${readableDate(endDate)}.`);
    setSuccessToast({ id: crypto.randomUUID(), message: "Savings locked successfully!" });
  }

  if (!ready) return <main className={styles.mainContent} aria-live="polite">Loading lock savings…</main>;

  return (
    <DashboardFrame email={email} active="Lock Savings">
      <header className={styles.pageHeading}>
        <h1>Lock Savings</h1>
        <p>Choose a term, set a target, and track your progress.</p>
      </header>

      <p className={styles.lockBalanceNotice}>Available wallet balance: <strong>{money(walletBalance)}</strong>. The commitment amount is deducted from your tracked balance when created.</p>

      <section className={styles.lockSummary} aria-label="Commitment totals">
        <article className={styles.statCard + " " + styles.balanceCard}><p>Commitment targets</p><strong>{money(totalTarget)}</strong><small>{commitments.length ? `${commitments.length} commitment${commitments.length === 1 ? "" : "s"}` : "No commitments yet"}</small></article>
        <article className={styles.statCard}><p>Amount locked</p><strong>{money(totalLocked)}</strong><small>Deducted from wallet balance</small></article>
        <article className={styles.statCard}><p>Available balance</p><strong>{money(walletBalance)}</strong><small>Available for other spending</small></article>
      </section>

      <div className={styles.lockContentGrid}>
        <form className={`${styles.panel} ${styles.lockForm}`} onSubmit={createCommitment} noValidate>
          <h2>Create commitment</h2>
          <div className={styles.transactionField}>
            <label htmlFor="lockPlan">Lock plan</label>
            <select id="lockPlan" value={planMonths} onChange={(event) => setPlanMonths(Number(event.target.value))}>
              {lockPlans.map((months) => <option key={months} value={months}>{months} month{months === 1 ? "" : "s"}</option>)}
            </select>
          </div>
          <div className={styles.transactionField}>
            <label htmlFor="lockTarget">Amount to lock</label>
            <div className={styles.transactionAmount}><span aria-hidden="true">₦</span><input id="lockTarget" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={targetAmount} onChange={(event) => { setTargetAmount(event.target.value); setError(""); setNotice(""); }} /></div>
          </div>
          <div className={styles.lockDates}>
            <div className={styles.transactionField}>
              <label htmlFor="startDate">Start date</label>
              <input id="startDate" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setError(""); }} required />
            </div>
            <div className={styles.transactionField}>
              <label htmlFor="endDate">End date</label>
              <input id="endDate" type="date" value={endDate} readOnly />
            </div>
          </div>
          <div className={styles.transactionField}>
            <label htmlFor="lockDescription">Description (optional)</label>
            <input id="lockDescription" type="text" maxLength={120} placeholder="e.g. Rent for next semester" value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className={styles.transactionField}>
            <label htmlFor="lockTransactionPin">Transaction PIN</label>
            <div className={styles.secretInputWrap}><input id="lockTransactionPin" type={showPin ? "text" : "password"} inputMode="numeric" autoComplete="off" maxLength={4} placeholder="Enter your 4-digit PIN" value={transactionPin} onChange={(event) => { setTransactionPin(event.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }} /><button type="button" className={styles.secretToggle} aria-label={showPin ? "Hide PIN" : "Show PIN"} onClick={() => setShowPin((visible) => !visible)}>{showPin ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            <span className={styles.transactionFootnote}>Use the personal PIN you created when setting up your wallet.</span>
          </div>
          {error && <p className={styles.goalError} role="alert">{error}</p>}
          {notice && <p className={styles.goalNotice} role="status">{notice}</p>}
          <button className={styles.primaryAction} type="submit">Lock savings</button>
        </form>

        <section className={styles.panel + " " + styles.commitmentPanel}>
          <h2>Your commitments</h2>
          {commitments.length ? (
            <div className={styles.commitmentList}>
              {commitments.map((commitment) => {
                const progress = getTermProgress(commitment.startDate, commitment.endDate);
                const complete = progress >= 100;
                const withdrawn = Boolean(commitment.withdrawnAt);
                const due = localDateValue() >= commitment.endDate;
                return (
                  <article className={styles.commitmentItem} key={commitment.id}>
                    <div className={styles.commitmentHeading}><strong>{commitment.description || `${commitment.planMonths}-month lock`}</strong><span>{money(commitment.lockedAmount)} {withdrawn ? "withdrawn" : "locked"}</span></div>
                    <div className={styles.progressTrack} role="progressbar" aria-label={`${commitment.planMonths}-month lock progress`} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><div className={styles.progressBar} style={{ width: `${progress}%` }} /></div>
                    <p>{complete ? "Term complete" : `${Math.floor(progress)}% of lock term`} · {readableDate(commitment.startDate)} – {readableDate(commitment.endDate)}</p>
                    <button className={styles.secondaryAction} type="button" disabled={!due || withdrawn} onClick={() => withdrawCommitment(commitment.id)}>{withdrawn ? "Withdrawn" : "Withdrawal"}</button>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className={styles.emptyTransactions}>No commitments yet. Choose a plan and lock an amount from your available balance.</p>
          )}
        </section>
      </div>
      {successToast && <TransactionSuccessPopup key={successToast.id} message={successToast.message} />}
    </DashboardFrame>
  );
}

export default function LockSavingsPage() {
  return <Suspense fallback={null}><LockSavingsContent /></Suspense>;
}
