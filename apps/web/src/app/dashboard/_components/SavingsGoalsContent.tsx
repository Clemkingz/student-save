"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { ManualContribution } from "./ManualContribution";
import { DashboardFrame } from "./DashboardFrame";
import { useDashboardSession } from "./useDashboardSession";
import styles from "../dashboard.module.css";

import { createClient } from "@repo/supabase/browser";
import { rpcMessage, toKobo, useGoals, useLedger, useRefreshFinance, type RpcResult, type SavingsGoal as Goal } from "../../../lib/queries/ledger";

import { ContributionSettingsDialog } from "./ContributionSettingsDialog";
import { GoalWithdrawalButton } from "./GoalWithdrawalButton";
import { PageLoader } from "../../PageLoader";

const goalOptions = ["Laptop", "Textbook", "Phone", "Bag", "FYB payment", "Tuition", "Accommodation", "Travel", "Emergency fund", "Custom goal"];

function money(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function SavingsGoalsContent({ goalId }: { goalId?: string }) {
  const { userId, email, ready } = useDashboardSession();
  const { data: ledger } = useLedger(ready ? userId : "");
  const { data: goals = [], refetch: refetchGoals } = useGoals(ready ? userId : "");
  const refreshFinance = useRefreshFinance();
  const attemptKey = useRef("");
  const [settingsGoal, setSettingsGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"goal" | "contribution" | null>(null);
  const [goalOption, setGoalOption] = useState(goalOptions[0]);
  const [customName, setCustomName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const balance = ledger?.balance ?? 0;
  const availableBalance = balance;

  function openForm(nextMode: "goal" | "contribution") {
    setMode(nextMode);
    setError("");
    setNotice("");
  }

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = goalOption === "Custom goal" ? customName.trim() : goalOption;
    const target = Number(targetAmount);
    if (!name) {
      setError("Enter a name for your goal.");
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      setError("Enter a target amount greater than zero.");
      return;
    }
    if (toKobo(target) < 1 || !Number.isSafeInteger(toKobo(target))) { setError("Enter a valid target of at least ₦0.01."); return; }
    setSaving(true);
    attemptKey.current ||= crypto.randomUUID();
    const { data, error: rpcError } = await createClient().rpc("create_goal", { p_name: name, p_target: toKobo(target), p_due_date: dueDate || (null as unknown as string), p_idempotency_key: attemptKey.current });
    const result = data as (RpcResult & { goal_id?: string }) | null;
    if (rpcError || !result?.ok) {
      setSaving(false);
      setError(rpcMessage(result, "Could not save this goal."));
      return;
    }
    attemptKey.current = "";
    const { data: latest } = await refetchGoals();
    setSaving(false);
    setSettingsGoal(latest?.find((goal) => goal.id === result.goal_id) ?? null);
    setTargetAmount(""); setCustomName(""); setDueDate("");
    setError(""); setNotice(`${name} goal created. Choose a contribution method now or later.`); setMode(null);
  }

  async function pauseContributions(goalId: string) {
    setSaving(true);
    const { data, error: rpcError } = await createClient().rpc("pause_goal_contributions", { p_goal: goalId });
    setSaving(false);
    const result = data as RpcResult | null;
    if (rpcError || !result?.ok) {
      setError(rpcMessage(result, "Could not pause contributions."));
      return;
    }
    await refreshFinance();
    setNotice("Automatic contributions paused."); setError("");
  }

  const visibleGoals = goalId ? goals.filter((goal) => goal.id === goalId) : goals;
  const openGoals = visibleGoals.filter((goal) => !goal.withdrawnAt && goal.savedAmount < goal.targetAmount);
  // Automatic goals only take money from their schedule. Switching to manual in contribution settings unlocks them.
  const contributionGoals = openGoals.filter((goal) => goal.contributionMethod !== "auto");
  const automaticGoals = openGoals.filter((goal) => goal.contributionMethod === "auto");
  const [chosenGoalId, setChosenGoalId] = useState("");
  const contributionGoal = contributionGoals.find((goal) => goal.id === chosenGoalId) ?? contributionGoals[0];

  if (!ready || !ledger) return <PageLoader message="Loading savings goals…" />;

  return (
    <DashboardFrame email={email} active="Savings Goals">
      <header className={styles.pageHeading}>
        <h1>{goalId ? visibleGoals[0]?.name ?? "Goal details" : "Savings goals"}</h1>
        <p>Set a target and save at your own pace from your available balance.</p>
        {goalId && <Link href="/dashboard/savings-goals">Back to savings goals</Link>}
      </header>

      <section className={styles.goalSummary} aria-label="Savings balance">
        <div><span>Tracked balance</span><strong>{money(balance)}</strong></div>
        <div><span>Available to contribute</span><strong>{money(availableBalance)}</strong></div>
      </section>

      <div className={styles.goalActions}>
        {!goalId && <div className={styles.goalStep}>
          <span className={styles.goalStepLabel}><span>01</span> Step 1</span>
          <button className={styles.primaryAction} type="button" onClick={() => openForm("goal")}>New goal</button>
        </div>}
        <div className={styles.goalStep}>
          {!goalId && <span className={styles.goalStepLabel}><span>02</span> Step 2</span>}
          <button className={styles.secondaryAction} type="button" disabled={contributionGoals.length === 0} onClick={() => openForm("contribution")}>Contribution</button>
        </div>
      </div>

      {contributionGoals.length === 0 && automaticGoals.length > 0 && <p className={styles.goalLockedNote}><Lock size={14} aria-hidden="true" /> {goalId ? "This goal saves automatically." : "Your open goals save automatically."} Switch to manual in contribution settings to add funds yourself.</p>}

      {mode === "goal" && (
        <form className={`${styles.panel} ${styles.goalForm}`} onSubmit={saveGoal} noValidate>
          <h2>Create a savings goal</h2>
          <div className={styles.goalFormGrid}>
            <div className={styles.transactionField}>
              <label htmlFor="goalType">Goal</label>
              <select id="goalType" value={goalOption} onChange={(event) => setGoalOption(event.target.value)}>
                {goalOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            {goalOption === "Custom goal" && <div className={styles.transactionField}><label htmlFor="customGoal">Goal name</label><input id="customGoal" type="text" maxLength={60} placeholder="e.g. School trip" value={customName} onChange={(event) => setCustomName(event.target.value)} /></div>}
            <div className={styles.transactionField}>
              <label htmlFor="targetAmount">Target amount</label>
              <div className={styles.transactionAmount}><span aria-hidden="true">₦</span><input id="targetAmount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} /></div>
            </div>
            <div className={styles.transactionField}>
              <label htmlFor="dueDate">Target date (optional)</label>
              <input id="dueDate" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
          </div>
          {error && <p className={styles.goalError} role="alert">{error}</p>}
          <p className={styles.transactionFootnote}>Create your goal first. You can choose automatic or manual contributions next, or skip for now.</p>
          <button className={styles.primaryAction} type="submit" disabled={saving} aria-busy={saving}>{saving ? "Saving…" : "Save goal"}</button>
        </form>
      )}

      {mode === "contribution" && contributionGoal && <section className={styles.manualContributionGrid} aria-label="Manual contribution">
        {contributionGoals.length + automaticGoals.length > 1 && <div className={`${styles.panel} ${styles.contributionPicker}`}>
          <h2 id="contributionPickerLabel">Choose a goal</h2>
          <div className={styles.contributionPickerList} role="radiogroup" aria-labelledby="contributionPickerLabel">
            {contributionGoals.map((goal) => <button key={goal.id} type="button" role="radio" aria-checked={goal.id === contributionGoal.id} className={goal.id === contributionGoal.id ? styles.contributionPickerActive : styles.contributionPickerOption} onClick={() => setChosenGoalId(goal.id)}>
              <strong>{goal.name}</strong><span>{money(goal.savedAmount)} of {money(goal.targetAmount)}</span>
            </button>)}
            {automaticGoals.map((goal) => <button key={goal.id} type="button" role="radio" aria-checked={false} aria-disabled="true" disabled className={`${styles.contributionPickerOption} ${styles.contributionPickerLocked}`} title="Switch to manual in contribution settings to add funds">
              <strong><Lock size={14} aria-hidden="true" /> {goal.name}</strong><span>Automatic · change in contribution settings</span>
            </button>)}
          </div>
        </div>}
        <ManualContribution key={contributionGoal.id} goal={contributionGoal} balance={availableBalance} />
      </section>}

      {mode === null && error && <p className={styles.goalError} role="alert">{error}</p>}
      {notice && <p className={styles.goalNotice} role="status">{notice}</p>}

      <section className={styles.panel + " " + styles.goalsPanel}>
        <h2>{goalId ? "Goal details" : "Your goals"}</h2>
        {visibleGoals.length ? (
          <div className={styles.goalList}>
            {visibleGoals.map((goal) => {
              const progress = Math.min(100, goal.savedAmount / goal.targetAmount * 100);
              return (
                <article className={styles.goalItem} key={goal.id}>
                  <div className={styles.goalHeading}><strong>{goalId ? goal.name : <Link href={`/dashboard/savings-goals/${encodeURIComponent(goal.id)}`}>{goal.name}</Link>}</strong><span>{money(goal.savedAmount)} of {money(goal.targetAmount)}</span></div>
                  <div className={styles.progressTrack}><div className={styles.progressBar} style={{ width: `${progress}%` }} /></div>
                  <p>{goal.contributionMethod === "auto" ? `${money(goal.autoAmount ?? 0)} ${goal.autoFrequency} contribution` : goal.contributionMethod === "manual" ? "Manual contributions · add money whenever you choose" : "No contribution method selected"}{goal.dueDate ? ` · due ${new Date(`${goal.dueDate}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>
                  <p>{goal.withdrawnAt ? `Withdrawn · ${new Date(goal.withdrawnAt).toLocaleDateString("en-GB")}` : goal.autoContribute ? `Automatic · next due ${goal.nextContributionDate}` : goal.contributionMethod === "auto" ? "Automatic contributions paused" : "Automatic contributions off"}</p>
                  {goal.contributionMethod === "auto" && !goal.withdrawnAt && goal.savedAmount < goal.targetAmount && <p className={styles.goalLockedNote}><Lock size={14} aria-hidden="true" /> Manual top-ups are off for this goal. Change it to manual in contribution settings to add funds.</p>}
                  <div className={styles.goalCardActions}>
                    <button className={styles.secondaryAction} type="button" disabled={saving || Boolean(goal.withdrawnAt)} onClick={() => setSettingsGoal(goal)}>Contribution settings</button>
                    {goal.autoContribute && !goal.withdrawnAt && goal.savedAmount < goal.targetAmount && <button className={styles.secondaryAction} type="button" disabled={saving} onClick={() => void pauseContributions(goal.id)}>Pause automatic savings</button>}
                    <GoalWithdrawalButton goal={goal} />
                  </div>

                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyTransactions}>{goalId ? "This goal could not be found." : "No savings goals yet. Create one to set a target and contribution plan."}</p>
        )}
      </section>

      <p className={styles.disclaimer}>Automatic savings run on schedule, even when StudentSave is closed. Insufficient funds wait for a top-up. All money here is simulated.</p>
      {settingsGoal && <ContributionSettingsDialog key={settingsGoal.id} goal={settingsGoal} onClose={() => setSettingsGoal(null)} />}
    </DashboardFrame>
  );
}
