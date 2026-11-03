"use client";

import { useId, useRef, useState } from "react";
import { GoalDialog } from "./GoalDialog";
import { createClient } from "@repo/supabase/browser";
import { rpcMessage, toKobo, useRefreshFinance, type RpcResult, type SavingsGoal } from "../../../lib/queries/ledger";
import styles from "../dashboard.module.css";

export function GoalWithdrawalButton({ goal }: { goal: SavingsGoal }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const submitting = useRef(false);
  const tooltipId = useId();
  const pinId = useId();
  const refreshFinance = useRefreshFinance();
  const eligible = !goal.withdrawnAt && goal.targetAmount > 0 && goal.savedAmount >= goal.targetAmount;
  const tooltip = goal.withdrawnAt ? "This goal has already been withdrawn" : "Available once your goal is reached";
  const money = (amount: number) => `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

  async function confirm() {
    if (submitting.current) return;
    submitting.current = true; setSaving(true); setError("");
    const { data, error: rpcError } = await createClient().rpc("withdraw_goal", { p_goal: goal.id, p_expected_saved: toKobo(goal.savedAmount), p_pin: pin });
    const result = data as RpcResult | null;
    if (rpcError || !result?.ok) {
      setError(rpcMessage(result, "Could not withdraw this goal."));
    } else {
      setNotice(`${money(goal.savedAmount)} returned to your balance.`);
      await refreshFinance();
      setOpen(false); setPin("");
    }
    submitting.current = false; setSaving(false);
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
        <p>Withdraw {money(goal.savedAmount)} from {goal.name} to your balance? This is simulated money.</p>
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
