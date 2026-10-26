"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ManualContribution } from "./ManualContribution";
import { DashboardFrame } from "./DashboardFrame";
import { getMockTransactions } from "./mockFinance";
import { useDashboardSession } from "./useDashboardSession";
import styles from "../dashboard.module.css";

import { cents, walletCents, normalizeSavingsGoal, type SavingsGoal as Goal } from "./savingsAutomation";
import { readFinanceList, saveFinance, withFinanceLock } from "./financeStorage";

import { ContributionSettingsDialog } from "./ContributionSettingsDialog";
import { GoalWithdrawalButton } from "./GoalWithdrawalButton";

const goalOptions = ["Laptop", "Textbook", "Phone", "Bag", "FYB payment", "Tuition", "Accommodation", "Travel", "Emergency fund", "Custom goal"];

function money(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function SavingsGoalsContent({ goalId }: { goalId?: string }) {
  const { email, ready } = useDashboardSession();
  const goalsKey = `studentsave:savings-goals:${email}`;
  const [goals, setGoals] = useState<Goal[]>([]);
  const [settingsGoal, setSettingsGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState(0);
  const [mode, setMode] = useState<"goal" | "contribution" | null>(null);
  const [goalOption, setGoalOption] = useState(goalOptions[0]);
  const [customName, setCustomName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!ready || !email) return;
    const refresh = () => {
      try {
        setBalance(Math.max(0, walletCents(getMockTransactions(email))) / 100);
        setGoals(readFinanceList<Goal>(goalsKey).map(normalizeSavingsGoal));
      } catch { setError("Your savings records could not be loaded. Please reload and try again."); }
    };
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [email, goalsKey, ready]);

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
    if (cents(target) < 1 || !Number.isSafeInteger(cents(target))) { setError("Enter a valid target of at least ₦0.01."); return; }
    setSaving(true);
    try {
      await withFinanceLock(email, async () => {
        const goal: Goal = {
          id: crypto.randomUUID(), name, targetAmount: cents(target) / 100, savedAmount: 0,
          contributionAmount: 0, frequency: "monthly", dueDate,
          createdAt: new Date().toISOString(), contributionMethod: "none", autoContribute: false,
        };
        saveFinance(email, { [goalsKey]: [goal, ...readFinanceList<Goal>(goalsKey)] });
        setSettingsGoal(goal);
      });
      setTargetAmount(""); setCustomName(""); setDueDate("");
      setError(""); setNotice(`${name} goal created. Choose a contribution method now or later.`); setMode(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this goal."); }
    finally { setSaving(false); }
  }

  async function pauseContributions(goalId: string) {
    setSaving(true);
    try {
      await withFinanceLock(email, () => {
        const current = readFinanceList<Goal>(goalsKey);
        saveFinance(email, { [goalsKey]: current.map((goal) => goal.id === goalId ? { ...goal, autoContribute: false } : goal) });
      });
      setNotice("Automatic contributions paused."); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not pause contributions."); }
    finally { setSaving(false); }
  }

  const visibleGoals = goalId ? goals.filter((goal) => goal.id === goalId) : goals;
  const availableGoals = goals.filter((goal) => !goal.withdrawnAt && goal.savedAmount < goal.targetAmount);

  if (!ready) return <main className={styles.mainContent} aria-live="polite">Loading savings goals…</main>;

  return (
    <DashboardFrame email={email} active="Savings Goals">
      <header className={styles.pageHeading}>
        <h1>{goalId ? visibleGoals[0]?.name ?? "Goal details" : "Savings goals"}</h1>
        <p>Set a target and save at your own pace from your available balance.</p>
        {goalId && <Link href={`/dashboard/savings-goals?email=${encodeURIComponent(email)}`}>Back to savings goals</Link>}
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
          <button className={styles.secondaryAction} type="button" disabled={availableGoals.length === 0} onClick={() => openForm("contribution")}>Contribution</button>
        </div>
      </div>

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
          <button className={styles.primaryAction} type="submit" disabled={saving}>{saving ? "Saving…" : "Save goal"}</button>
        </form>
      )}

      <section hidden={mode !== "contribution"} aria-label="Manual contributions"><div className={styles.manualContributionGrid}>
        {visibleGoals.filter(goal => !goal.withdrawnAt).map(goal => <ManualContribution key={goal.id} email={email} goal={goal} balance={availableBalance} />)}
      </div></section>

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
                  <div className={styles.goalHeading}><strong>{goalId ? goal.name : <Link href={`/dashboard/savings-goals/${encodeURIComponent(goal.id)}?email=${encodeURIComponent(email)}`}>{goal.name}</Link>}</strong><span>{money(goal.savedAmount)} of {money(goal.targetAmount)}</span></div>
                  <div className={styles.progressTrack}><div className={styles.progressBar} style={{ width: `${progress}%` }} /></div>
                  <p>{goal.contributionMethod === "auto" ? `${money(goal.autoAmount ?? goal.contributionAmount)} ${goal.autoFrequency ?? goal.frequency} contribution` : goal.contributionMethod === "manual" ? "Manual contributions · add money whenever you choose" : "No contribution method selected"}{goal.dueDate ? ` · due ${new Date(`${goal.dueDate}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>
                  <p>{goal.withdrawnAt ? `Withdrawn · ${new Date(goal.withdrawnAt).toLocaleDateString("en-GB")}` : goal.autoContribute ? `Automatic · next due ${goal.nextContributionDate}` : goal.contributionMethod === "auto" ? "Automatic contributions paused" : "Automatic contributions off"}</p>
                  <div className={styles.goalCardActions}>
                    <button className={styles.secondaryAction} type="button" disabled={saving || Boolean(goal.withdrawnAt)} onClick={() => setSettingsGoal(goal)}>Contribution settings</button>
                    {goal.autoContribute && !goal.withdrawnAt && goal.savedAmount < goal.targetAmount && <button className={styles.secondaryAction} type="button" disabled={saving} onClick={() => void pauseContributions(goal.id)}>Pause automatic savings</button>}
                    <GoalWithdrawalButton goal={goal} email={email} />
                  </div>

                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyTransactions}>{goalId ? "This goal could not be found." : "No savings goals yet. Create one to set a target and contribution plan."}</p>
        )}
      </section>

      <p className={styles.disclaimer}>Automatic savings run while StudentSave is open and catch up on due contributions when you return. Insufficient funds wait for a top-up. This demo uses your tracked balance and does not move bank funds.</p>
      {settingsGoal && <ContributionSettingsDialog key={settingsGoal.id} email={email} goal={settingsGoal} onClose={() => setSettingsGoal(null)} />}
    </DashboardFrame>
  );
}
