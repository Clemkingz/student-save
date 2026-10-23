"use client";

import { useState, type FormEvent } from "react";
import { CalendarClock, HandCoins } from "lucide-react";
import { GoalDialog } from "./GoalDialog";
import { configureGoalContributions, contributionSettingsFor } from "./goalSettings";
import { readFinanceList, saveFinance, withFinanceLock } from "./financeStorage";
import { localDateValue } from "./mockFinance";
import { verifyTransactionPin } from "./transactionPin";
import type { ContributionMethod, Frequency, SavingsGoal } from "./savingsAutomation";
import styles from "../dashboard.module.css";

export function ContributionSettingsDialog({ email, goal, onClose }: {
  email: string;
  goal: SavingsGoal;
  onClose: () => void;
}) {
  const initial = contributionSettingsFor(goal);
  const [method, setMethod] = useState<ContributionMethod>(initial.contributionMethod);
  const [amount, setAmount] = useState(initial.autoAmount?.toString() ?? "");
  const [frequency, setFrequency] = useState<Frequency | "">(initial.autoFrequency ?? "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (method === "none") { setError("Choose a method or skip for now."); return; }
    setSaving(true); setError("");
    try {
      const settings = { contributionMethod: method, autoAmount: Number(amount), autoFrequency: frequency || undefined };
      // Validate before asking for authorization; revalidate fresh records inside the lock.
      configureGoalContributions(goal, settings, localDateValue());
      await withFinanceLock(email, async () => {
        if (method === "auto" && !(await verifyTransactionPin(email, pin)))
          throw new Error("Enter your correct 4-digit transaction PIN to authorize automatic contributions.");
        const key = `studentsave:savings-goals:${email}`;
        const current = readFinanceList<SavingsGoal>(key);
        const latest = current.find((item) => item.id === goal.id);
        if (!latest) throw new Error("Savings goal not found.");
        const updated = configureGoalContributions(latest, settings, localDateValue());
        saveFinance(email, { [key]: current.map((item) => item.id === goal.id ? updated : item) });
      });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save contribution settings.");
    } finally { setSaving(false); }
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
          <p className={styles.transactionFootnote}>Contributions start next period and use your tracked balance while StudentSave is open. Insufficient funds wait for a top-up.</p>
        </>}
        {error && <p className={styles.goalError} role="alert">{error}</p>}
        <button className={styles.primaryAction} type="submit" disabled={saving}>{saving ? "Saving…" : "Save contribution settings"}</button>
        <button className={styles.secondaryAction} type="button" onClick={onClose}>Skip for now</button>
      </form>
    </GoalDialog>
  );
}
