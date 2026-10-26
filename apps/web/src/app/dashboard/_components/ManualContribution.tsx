"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { cents, walletCents, type SavingsGoal, type SavingsContribution } from "./savingsAutomation";
import { readFinanceList, saveFinance, withFinanceLock } from "./financeStorage";
import { getMockTransactions, localDateValue, type MockTransaction } from "./mockFinance";
import { verifyTransactionPin } from "./transactionPin";
import styles from "../dashboard.module.css";

export function ManualContribution({ email, goal, balance }: { email: string; goal: SavingsGoal; balance: number }) {
  const [amount, setAmount] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<number | null>(null);
  const numeric = Number(amount);
  const valid = Number.isFinite(numeric) && Number.isSafeInteger(cents(numeric)) && numeric >= .01 && cents(numeric) <= cents(Math.min(balance, goal.targetAmount - goal.savedAmount));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || busy.current) return;
    busy.current = true; setSaving(true); setError(""); setSuccess(null);
    try {
      await withFinanceLock(email, async () => {
        if (!(await verifyTransactionPin(email, pin))) throw new Error("Enter your correct 4-digit transaction PIN.");
        const goalsKey = `studentsave:savings-goals:${email}`;
        const contributionsKey = `studentsave:savings-contributions:${email}`;
        const transactions = getMockTransactions(email);
        const goals = readFinanceList<SavingsGoal>(goalsKey);
        const current = goals.find(item => item.id === goal.id);
        if (!current || current.withdrawnAt) throw new Error("This goal is unavailable.");
        if (cents(numeric) > walletCents(transactions)) throw new Error("Your balance is too low. Add funds before contributing.");
        if (cents(numeric) > cents(current.targetAmount) - cents(current.savedAmount)) throw new Error("This amount exceeds the remaining goal target.");
        const id = crypto.randomUUID();
        const contribution: SavingsContribution = { id, transactionId: id, goalId: goal.id, amount: cents(numeric) / 100, frequency: current.frequency, date: localDateValue(), createdAt: new Date().toISOString() };
        const transaction: MockTransaction = { id, type: "expense", amount: contribution.amount, category: "Savings contribution", date: localDateValue(), note: `Contribution to ${current.name}` };
        saveFinance(email, {
          [goalsKey]: goals.map(item => item.id === goal.id ? { ...item, savedAmount: (cents(item.savedAmount) + cents(numeric)) / 100 } : item),
          [contributionsKey]: [contribution, ...readFinanceList<SavingsContribution>(contributionsKey)],
          [`studentsave:transactions:${email}`]: [transaction, ...transactions],
        });
      });
      setSuccess(cents(numeric) / 100); setAmount(""); setPin("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save contribution."); }
    finally { busy.current = false; setSaving(false); }
  }
  return <form className={`${styles.panel} ${styles.manualContribution}`} onSubmit={submit} noValidate>
    <h3>{goal.name}</h3>
    <div className={styles.transactionField}><label htmlFor={`amount-${goal.id}`}>Amount to contribute (₦)</label><input id={`amount-${goal.id}`} type="number" inputMode="decimal" min="0.01" max={Math.min(balance, goal.targetAmount-goal.savedAmount)} step="0.01" value={amount} onChange={event => { setAmount(event.target.value); setError(""); }} disabled={saving} aria-invalid={amount !== "" && !valid} /></div>
    {amount !== "" && !valid && <p className={styles.goalError}>Enter at least ₦0.01, within your balance and remaining target.</p>}
    <div className={styles.transactionField}><label htmlFor={`pin-${goal.id}`}>Transaction PIN</label><div className={styles.secretInputWrap}><input id={`pin-${goal.id}`} type={showPin ? "text" : "password"} inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, "").slice(0,4))} disabled={saving} /><button className={styles.secretToggle} type="button" aria-label={showPin ? "Hide PIN" : "Show PIN"} onClick={() => setShowPin(visible => !visible)}>{showPin ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><span className={styles.transactionFootnote}>Use the personal PIN you created when setting up your wallet.</span></div>
    {error && <p role="alert" className={styles.goalError}>{error}</p>}
    {success !== null && <p role="status"><strong className="funds-added-amount">+₦{success.toLocaleString("en-NG")}</strong> added to {goal.name}.</p>}
    <button className={styles.primaryAction} type="submit" disabled={!valid || saving} aria-busy={saving}>{saving ? "Contributing…" : "Contribute"}</button>
  </form>;
}
