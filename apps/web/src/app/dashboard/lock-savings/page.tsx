"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { readFinanceList, saveFinance, withFinanceLock } from "../_components/financeStorage";
import { cents, walletCents } from "../_components/savingsAutomation";
import { Eye, EyeOff } from "lucide-react";
import { DashboardFrame } from "../_components/DashboardFrame";
import { AnimatedPadlock } from "../_components/AnimatedPadlock";
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
  withdrawalFee?: number;
  withdrawalNet?: number;
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
  const [collectionId, setCollectionId] = useState("");
  const [collectionPin, setCollectionPin] = useState("");
  const [saving, setSaving] = useState(false);
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
  const [successToast, setSuccessToast] = useState<{ id: string; message: string; tone?: "success" | "error"; lock?: boolean } | null>(null);
  const endDate = addMonths(startDate, planMonths);

  useEffect(() => {
    if (!ready || !email) return;
    const refresh = () => {
      try {
        setWalletBalance(Math.max(0, walletCents(getMockTransactions(email))) / 100);
        setCommitments(readFinanceList<Commitment>(storageKey));
      } catch { setError("Your savings records could not be loaded. Please reload and try again."); }
    };
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [email, ready, storageKey]);

  const totalTarget = commitments.reduce((sum, commitment) => sum + commitment.targetAmount, 0);
  const totalLocked = commitments.reduce((sum, commitment) => sum + (commitment.withdrawnAt ? 0 : commitment.lockedAmount), 0);

  async function withdrawCommitment(event: FormEvent<HTMLFormElement>, commitmentId: string) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await withFinanceLock(email, async () => {
        if (!(await verifyTransactionPin(email, collectionPin))) throw new Error("Enter your correct 4-digit transaction PIN to collect these savings.");
        const transactions = getMockTransactions(email);
        const current = readFinanceList<Commitment>(storageKey);
        const commitment = current.find(item => item.id === commitmentId);
        if (!commitment || commitment.withdrawnAt) throw new Error("These savings have already been collected or are unavailable.");
        if (!Number.isFinite(commitment.lockedAmount) || cents(commitment.lockedAmount) <= 0) throw new Error("There are no locked funds to collect.");
        const gross = cents(commitment.lockedAmount);
        const fee = Math.round(gross * .05);
        const net = (gross - fee) / 100;
        const date = localDateValue();
        const withdrawal: MockTransaction = { id: `lock-collection:${commitment.id}`, type: "income", amount: gross / 100, category: "Lock Savings Withdrawal", date, note: commitment.description || "Collected locked savings" };
        const feeTransaction: MockTransaction = { id: `lock-collection-fee:${commitment.id}`, type: "expense", amount: fee / 100, category: "Lock Savings Fee", date, note: "5% collection fee" };
        saveFinance(email, {
          [`studentsave:transactions:${email}`]: [withdrawal, ...(fee > 0 ? [feeTransaction] : []), ...transactions],
          [storageKey]: current.map(item => item.id === commitmentId ? { ...item, withdrawnAt: new Date().toISOString(), withdrawalFee: fee / 100, withdrawalNet: net } : item),
        });
        setNotice(`${money(net)} returned to your available balance after the ${money(fee / 100)} collection fee (5%).`);
      });
      setCollectionId(""); setCollectionPin(""); setError("");
      setSuccessToast({ id: crypto.randomUUID(), message: "Withdrawal successful", tone: "success" });
    } catch (reason) { const message = reason instanceof Error ? reason.message : "Could not collect these savings."; setError(message); setSuccessToast({ id: crypto.randomUUID(), message, tone: "error" }); }
    finally { setSaving(false); }
  }

  async function createCommitment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
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
    if (!startDate || !endDate || cents(target) < 1) { setError("Choose a valid start date and an amount of at least ₦0.01."); return; }
    setSaving(true);
    try {
      await withFinanceLock(email, async () => {
        if (!(await verifyTransactionPin(email, transactionPin))) throw new Error("Enter your correct 4-digit transaction PIN to lock these funds.");
        const transactions = getMockTransactions(email);
        const currentBalance = walletCents(transactions);
        if (cents(target) > currentBalance) throw new Error(`Your available balance is ${money(Math.max(0, currentBalance) / 100)}. Add funds or lower the amount.`);
        const commitment: Commitment = { id: crypto.randomUUID(), planMonths, targetAmount: cents(target) / 100, lockedAmount: cents(target) / 100, startDate, endDate, description: description.trim(), createdAt: new Date().toISOString() };
        const transaction: MockTransaction = { id: crypto.randomUUID(), type: "expense", amount: commitment.lockedAmount, category: "Lock Savings", date: localDateValue(), note: description.trim() || `${planMonths}-month lock savings commitment` };
        saveFinance(email, { [`studentsave:transactions:${email}`]: [transaction, ...transactions], [storageKey]: [commitment, ...readFinanceList<Commitment>(storageKey)] });
      });
      setTargetAmount(""); setDescription(""); setTransactionPin(""); setError("");
      setNotice(`${money(cents(target) / 100)} locked until ${readableDate(endDate)}. Collection at any time carries a 5% fee.`);
      setSuccessToast({ id: crypto.randomUUID(), message: "Lock confirmed", lock: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not lock these funds."); }
    finally { setSaving(false); }
  }

  if (!ready) return <main className={styles.mainContent} aria-live="polite">Loading lock savings…</main>;

  return (
    <DashboardFrame email={email} active="Lock Savings">
      <header className={styles.pageHeading}>
        <h1>Lock Savings</h1>
        <p>Choose a term, set a target, and track your progress.</p>
      </header>

      <p className={styles.lockBalanceNotice}>Available wallet balance: <strong>{money(walletBalance)}</strong>. The amount is deducted when locked. You can collect it at any time with a 5% fee, including after maturity.</p>

      {notice && <p className={styles.goalNotice} role="status">{notice}</p>}

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
          <button className={styles.primaryAction} type="submit" disabled={saving}>Lock savings</button>
        </form>

        <section className={styles.panel + " " + styles.commitmentPanel}>
          <h2>Your commitments</h2>
          {commitments.length ? (
            <div className={styles.commitmentList}>
              {commitments.map((commitment) => {
                const progress = getTermProgress(commitment.startDate, commitment.endDate);
                const complete = progress >= 100;
                const withdrawn = Boolean(commitment.withdrawnAt);
                const fee = Math.round(cents(commitment.lockedAmount) * .05) / 100;
                const net = (cents(commitment.lockedAmount) - cents(fee)) / 100;
                return (
                  <article className={styles.commitmentItem} key={commitment.id}>
                    <div className={styles.commitmentHeading}><strong>{commitment.description || `${commitment.planMonths}-month lock`}</strong><span>{money(commitment.lockedAmount)} {withdrawn ? "withdrawn" : "locked"}</span></div>
                    <div className={styles.progressTrack} role="progressbar" aria-label={`${commitment.planMonths}-month lock progress`} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><div className={styles.progressBar} style={{ width: `${progress}%` }} /></div>
                    <p>{complete ? "Term complete" : `${Math.floor(progress)}% of lock term`} · {readableDate(commitment.startDate)} – {readableDate(commitment.endDate)}</p>
                    {!withdrawn && <p>Collection fee (5%): {money(fee)} · You receive {money(net)}</p>}
                    {withdrawn && commitment.withdrawalNet !== undefined && <p>Collected {money(commitment.withdrawalNet)} · Fee {money(commitment.withdrawalFee || 0)}</p>}
                    <button className={styles.secondaryAction} type="button" disabled={withdrawn || saving} onClick={() => { setCollectionId(commitment.id); setCollectionPin(""); setError(""); }}>{withdrawn ? "Collected" : "Collect savings"}</button>
                    {collectionId === commitment.id && !withdrawn && <form className={styles.scheduleAuthorization} onSubmit={event => withdrawCommitment(event, commitment.id)}>
                      <p>Confirm collection of {money(commitment.lockedAmount)}. A 5% fee of {money(fee)} will be deducted; {money(net)} returns to your balance.</p>
                      <label htmlFor={`collection-pin-${commitment.id}`}>Transaction PIN</label>
                      <input id={`collection-pin-${commitment.id}`} type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={collectionPin} onChange={event => setCollectionPin(event.target.value.replace(/\D/g, "").slice(0, 4))} />
                      {error && <p className={styles.goalError} role="alert">{error}</p>}
                      <button className={styles.primaryAction} type="submit" disabled={saving}>{saving ? "Collecting…" : `Confirm · receive ${money(net)}`}</button>
                      <button className={styles.secondaryAction} type="button" disabled={saving} onClick={() => setCollectionId("")}>Cancel</button>
                    </form>}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className={styles.emptyTransactions}>No commitments yet. Choose a plan and lock an amount from your available balance.</p>
          )}
        </section>
      </div>
      {successToast && <TransactionSuccessPopup key={successToast.id} message={successToast.message} tone={successToast.tone}>{successToast.lock && <AnimatedPadlock />}</TransactionSuccessPopup>}
    </DashboardFrame>
  );
}

export default function LockSavingsPage() {
  return <Suspense fallback={null}><LockSavingsContent /></Suspense>;
}
