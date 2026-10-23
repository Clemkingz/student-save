"use client";

import { useId, useRef, useState } from "react";
import { GoalDialog } from "./GoalDialog";
import { applyGoalWithdrawal, canWithdrawGoal } from "./goalSettings";
import { readFinanceList, saveFinance, withFinanceLock } from "./financeStorage";
import { getMockTransactions, localDateValue } from "./mockFinance";
import { verifyTransactionPin } from "./transactionPin";
import type { SavingsGoal } from "./savingsAutomation";
import styles from "../dashboard.module.css";

export function GoalWithdrawalButton({ goal, email }: { goal: SavingsGoal; email: string }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const submitting = useRef(false);
  const tooltipId = useId();
  const pinId = useId();
  const eligible = canWithdrawGoal(goal);
  const tooltip = goal.withdrawnAt ? "This goal has already been withdrawn" : "Available once your goal is reached";
  const money = (amount: number) => `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

  async function confirm() {
    if (submitting.current) return;
    submitting.current = true; setSaving(true); setError("");
    try {
      await withFinanceLock(email, async () => {
        if (!(await verifyTransactionPin(email, pin))) throw new Error("Enter your correct 4-digit transaction PIN.");
        const transactions = getMockTransactions(email);
        const key = `studentsave:savings-goals:${email}`;
        const goals = readFinanceList<SavingsGoal>(key);
        const latest = goals.find((item) => item.id === goal.id);
        if (latest && latest.savedAmount !== goal.savedAmount)
          throw new Error("The saved amount has changed. Close this dialog and review the goal before withdrawing.");
        const result = applyGoalWithdrawal(goals, transactions, goal.id, `${localDateValue()}T${new Date().toTimeString().slice(0, 8)}`);
        saveFinance(email, { [key]: result.goals, [`studentsave:transactions:${email}`]: result.transactions });
        setNotice(`${money(result.amount)} returned to your tracked balance.`);
      });
      setOpen(false); setPin("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not withdraw this goal."); }
    finally { submitting.current = false; setSaving(false); }
  }

  return (
    <div className={styles.withdrawalControl}>
      {!goal.withdrawnAt && goal.savedAmount >= goal.targetAmount && <span className={styles.goalReached}>Goal reached 🎉</span>}
      <span className={styles.withdrawTooltip} tabIndex={!eligible ? 0 : undefined} title={!eligible ? tooltip : undefined} aria-describedby={!eligible ? tooltipId : undefined}>
        <button type="button" className={eligible ? `${styles.primaryAction} ${styles.withdrawReady}` : styles.secondaryAction} disabled={!eligible || saving} onClick={() => { setOpen(true); setError(""); setPin(""); }}> {goal.withdrawnAt ? "Withdrawn" : "Withdraw"}</button>
        {!eligible && <span id={tooltipId} role="tooltip" className={styles.withdrawTooltipText}>{tooltip}</span>}
      </span>
      {notice && <p role="status" className={styles.goalNotice}>{notice}</p>}
      {open && <GoalDialog title="Withdraw savings?" onClose={() => setOpen(false)}>
        <p>Withdraw {money(goal.savedAmount)} from {goal.name} to your tracked balance? This demo does not transfer bank funds.</p>
        <form className={styles.goalForm} onSubmit={(event) => { event.preventDefault(); void confirm(); }}>
          <div className={styles.paymentAmount}><span>Amount to withdraw</span><strong>{money(goal.savedAmount)}</strong></div>
          <div className={styles.transactionField}><label htmlFor={pinId}>Transaction PIN</label><input id={pinId} type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} /></div>
          {error && <p className={styles.goalError} role="alert">{error}</p>}
          <button className={styles.primaryAction} type="submit" disabled={saving}>{saving ? "Withdrawing…" : "Confirm"}</button>
          <button className={styles.secondaryAction} type="button" onClick={() => setOpen(false)}>Cancel</button>
        </form>
      </GoalDialog>}
    </div>
  );
}
