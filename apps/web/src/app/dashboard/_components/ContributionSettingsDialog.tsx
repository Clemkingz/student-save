"use client";

import { useState, type FormEvent } from "react";
import { CalendarClock, HandCoins } from "lucide-react";
import { GoalDialog } from "./GoalDialog";
import { createClient } from "@repo/supabase/browser";
import { rpcMessage, toKobo, useRefreshFinance, type RpcResult, type SavingsGoal } from "../../../lib/queries/ledger";
import styles from "../dashboard.module.css";

type ContributionMethod = SavingsGoal["contributionMethod"];
type Frequency = NonNullable<SavingsGoal["autoFrequency"]>;

export function ContributionSettingsDialog({ goal, onClose }: {
  goal: SavingsGoal;
  onClose: () => void;
}) {
  const refreshFinance = useRefreshFinance();
  const [method, setMethod] = useState<ContributionMethod>(goal.contributionMethod);
  const [amount, setAmount] = useState(goal.autoAmount?.toString() ?? "");
  const [frequency, setFrequency] = useState<Frequency | "">(goal.autoFrequency ?? "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (method === "none") { setError("Choose a method or skip for now."); return; }
    const automatic = method === "auto";
    if (automatic && (!Number.isFinite(Number(amount)) || toKobo(Number(amount)) < 1)) { setError("Enter an automatic contribution amount of at least ₦0.01."); return; }
    if (automatic && !frequency) { setError("Choose a daily, weekly, or monthly frequency."); return; }
    setSaving(true); setError("");
    const { data, error: rpcError } = await createClient().rpc("set_goal_contribution_settings", {
      p_goal: goal.id,
      p_method: method,
      p_amount: automatic ? toKobo(Number(amount)) : 0,
      p_frequency: frequency || "monthly",
      p_pin: pin,
    });
    setSaving(false);
    const result = data as RpcResult | null;
    if (rpcError || !result?.ok) {
      setError(rpcMessage(result, "Could not save contribution settings."));
      return;
    }
    await refreshFinance();
    onClose();
  }

  return (
    <GoalDialog title="How would you like to save for this goal?" onClose={onClose}>
      <p>Choose a contribution method for {goal.name}. You can change it later.</p>
      <form className={styles.goalForm} onSubmit={save} noValidate>
        <fieldset className={styles.contributionChoices}>
          <legend>Contribution method (optional)</legend>
          <label className={`${styles.contributionChoice} ${method === "auto" ? styles.contributionChoiceSelected : ""}`}>
            <input type="radio" name="contributionMethod" value="auto" checked={method === "auto"} onChange={() => { setMethod("auto"); setError(""); }} />
            <CalendarClock size={24} aria-hidden="true" />
            <span><strong>Automatic contribution</strong><small>Set an amount and save daily, weekly, or monthly.</small></span>
          </label>
          <label className={`${styles.contributionChoice} ${method === "manual" ? styles.contributionChoiceSelected : ""}`}>
            <input type="radio" name="contributionMethod" value="manual" checked={method === "manual"} onChange={() => { setMethod("manual"); setError(""); }} />
            <HandCoins size={24} aria-hidden="true" />
            <span><strong>Manual contribution</strong><small>Add money whenever you choose.</small></span>
          </label>
        </fieldset>
        {method === "auto" && <>
          <div className={styles.goalFormGrid}>
            <div className={styles.transactionField}><label htmlFor="autoAmount">Amount (₦)</label><input id="autoAmount" type="number" inputMode="decimal" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
            <div className={styles.transactionField}><label htmlFor="autoFrequency">Frequency</label><select id="autoFrequency" required value={frequency} onChange={(event) => setFrequency(event.target.value as Frequency | "")}><option value="">Choose frequency</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
          </div>
          <div className={styles.transactionField}><label htmlFor="automaticPin">Transaction PIN</label><input id="automaticPin" type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} /></div>
          <p className={styles.transactionFootnote}>Contributions start next period and run on schedule, even when StudentSave is closed. Insufficient funds wait for a top-up.</p>
        </>}
        {error && <p className={styles.goalError} role="alert">{error}</p>}
        <button className={styles.primaryAction} type="submit" disabled={saving} aria-busy={saving}>{saving ? "Saving…" : "Save contribution settings"}</button>
        <button className={styles.secondaryAction} type="button" onClick={onClose}>Skip for now</button>
      </form>
    </GoalDialog>
  );
}
