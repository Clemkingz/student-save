"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { DashboardFrame } from "../_components/DashboardFrame";
import { TransactionSuccessPopup } from "../_components/TransactionSuccessPopup";
import { getMockTransactions } from "../_components/mockFinance";
import { verifyTransactionPin } from "../_components/transactionPin";
import { useDashboardSession } from "../_components/useDashboardSession";
import styles from "../dashboard.module.css";

import { cents, walletCents, nextContributionDate, type Frequency, type SavingsGoal as Goal, type SavingsContribution as Contribution } from "../_components/savingsAutomation";
import { readFinanceList, saveFinance, withFinanceLock } from "../_components/financeStorage";
import { localDateValue, type MockTransaction } from "../_components/mockFinance";

const goalOptions = ["Laptop", "Textbook", "Phone", "Bag", "FYB payment", "Tuition", "Accommodation", "Travel", "Emergency fund", "Custom goal"];

function money(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function SavingsGoalsContent() {
  const { email, ready } = useDashboardSession();
  const goalsKey = `studentsave:savings-goals:${email}`;
  const contributionsKey = `studentsave:savings-contributions:${email}`;
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalPin, setGoalPin] = useState("");
  const [schedulePin, setSchedulePin] = useState("");
  const [scheduleGoalId, setScheduleGoalId] = useState("");
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState(0);
  const [mode, setMode] = useState<"goal" | "contribution" | null>(null);
  const [goalOption, setGoalOption] = useState(goalOptions[0]);
  const [customName, setCustomName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [plannedAmount, setPlannedAmount] = useState("");
  const [plannedFrequency, setPlannedFrequency] = useState<Frequency>("monthly");
  const [dueDate, setDueDate] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionPin, setContributionPin] = useState("");
  const [showContributionPin, setShowContributionPin] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [successToast, setSuccessToast] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    if (!ready || !email) return;
    const refresh = () => {
      try {
        setBalance(Math.max(0, walletCents(getMockTransactions(email))) / 100);
        setGoals(readFinanceList<Goal>(goalsKey));
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
    if (nextMode === "contribution" && goals[0]) setSelectedGoalId(goals[0].id);
  }

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = goalOption === "Custom goal" ? customName.trim() : goalOption;
    const target = Number(targetAmount);
    const planned = Number(plannedAmount);
    if (!name) {
      setError("Enter a name for your goal.");
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      setError("Enter a target amount greater than zero.");
      return;
    }
    if (!Number.isFinite(planned) || planned <= 0) {
      setError("Enter a daily or monthly contribution amount greater than zero.");
      return;
    }

    if (cents(target) < 1 || cents(planned) < 1) { setError("Amounts must be at least ₦0.01."); return; }
    setSaving(true);
    try {
      await withFinanceLock(email, async () => {
        if (!(await verifyTransactionPin(email, goalPin))) throw new Error("Enter your correct 4-digit transaction PIN to authorize automatic contributions.");
        const today = localDateValue();
        const goal: Goal = {
          id: crypto.randomUUID(), name, targetAmount: cents(target) / 100, savedAmount: 0,
          contributionAmount: cents(planned) / 100, frequency: plannedFrequency, dueDate,
          createdAt: new Date().toISOString(), autoContribute: true,
          nextContributionDate: nextContributionDate(today, plannedFrequency), scheduleDay: Number(today.slice(8, 10)),
        };
        saveFinance(email, { [goalsKey]: [goal, ...readFinanceList<Goal>(goalsKey)] });
        setSelectedGoalId(goal.id);
      });
      setTargetAmount(""); setPlannedAmount(""); setCustomName(""); setGoalPin("");
      setError(""); setNotice(`${name} goal created with automatic ${plannedFrequency} contributions.`); setMode(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this goal."); }
    finally { setSaving(false); }
  }

  async function changeSchedule(goalId: string, enable: boolean) {
    setSaving(true);
    try {
      await withFinanceLock(email, async () => {
        if (enable && !(await verifyTransactionPin(email, schedulePin))) throw new Error("Enter your correct 4-digit transaction PIN to authorize this schedule.");
        const today = localDateValue();
        const updated = readFinanceList<Goal>(goalsKey).map(goal => goal.id !== goalId ? goal : {
          ...goal, autoContribute: enable,
          ...(enable ? { nextContributionDate: nextContributionDate(today, goal.frequency), scheduleDay: Number(today.slice(8, 10)) } : {}),
        });
        saveFinance(email, { [goalsKey]: updated });
      });
      setScheduleGoalId(""); setSchedulePin(""); setError("");
      setNotice(enable ? "Automatic contributions enabled. The first contribution is due next period." : "Automatic contributions paused.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not change this schedule."); }
    finally { setSaving(false); }
  }

  async function saveContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(contributionAmount);
    if (!Number.isFinite(amount) || cents(amount) <= 0) { setError("Enter a contribution of at least ₦0.01."); return; }
    setSaving(true);
    try {
      await withFinanceLock(email, async () => {
        if (!(await verifyTransactionPin(email, contributionPin))) throw new Error("Enter your correct 4-digit transaction PIN.");
        const transactions = getMockTransactions(email);
        const currentGoals = readFinanceList<Goal>(goalsKey);
        const goal = currentGoals.find(item => item.id === selectedGoalId);
        if (!goal) throw new Error("Choose a savings goal.");
        if (cents(amount) > walletCents(transactions)) throw new Error("Your balance is too low. Add funds before contributing.");
        if (cents(amount) > cents(goal.targetAmount) - cents(goal.savedAmount)) throw new Error(`This goal needs only ${money((cents(goal.targetAmount) - cents(goal.savedAmount)) / 100)} more.`);
        const id = crypto.randomUUID();
        const contribution: Contribution = { id, transactionId: id, goalId: goal.id, amount: cents(amount) / 100, frequency: goal.frequency, date: localDateValue(), createdAt: new Date().toISOString() };
        const transaction: MockTransaction = { id, type: "expense", amount: contribution.amount, category: "Savings contribution", date: localDateValue(), note: `Contribution to ${goal.name}` };
        saveFinance(email, {
          [contributionsKey]: [contribution, ...readFinanceList<Contribution>(contributionsKey)],
          [goalsKey]: currentGoals.map(item => item.id === goal.id ? { ...item, savedAmount: (cents(item.savedAmount) + cents(amount)) / 100 } : item),
          [`studentsave:transactions:${email}`]: [transaction, ...transactions],
        });
        setNotice(`${money(contribution.amount)} added to ${goal.name}.`);
      });
      setContributionAmount(""); setContributionPin(""); setError(""); setMode(null);
      setSuccessToast({ id: crypto.randomUUID(), message: "Savings contribution successful!" });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this contribution."); }
    finally { setSaving(false); }
  }

  if (!ready) return <main className={styles.mainContent} aria-live="polite">Loading savings goals…</main>;

  return (
    <DashboardFrame email={email} active="Savings Goals">
      <header className={styles.pageHeading}>
        <h1>Savings goals</h1>
        <p>Set a target and save automatically from your available balance.</p>
      </header>

      <section className={styles.goalSummary} aria-label="Savings balance">
        <div><span>Tracked balance</span><strong>{money(balance)}</strong></div>
        <div><span>Available to contribute</span><strong>{money(availableBalance)}</strong></div>
      </section>

      <div className={styles.goalActions}>
        <div className={styles.goalStep}>
          <span className={styles.goalStepLabel}><span>01</span> Step 1</span>
          <button className={styles.primaryAction} type="button" onClick={() => openForm("goal")}>New goal</button>
        </div>
        <div className={styles.goalStep}>
          <span className={styles.goalStepLabel}><span>02</span> Step 2</span>
          <button className={styles.secondaryAction} type="button" disabled={goals.length === 0} onClick={() => openForm("contribution")}>Contribution</button>
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
              <label htmlFor="plannedFrequency">Contribution schedule</label>
              <select id="plannedFrequency" value={plannedFrequency} onChange={(event) => setPlannedFrequency(event.target.value as Frequency)}><option value="daily">Daily</option><option value="monthly">Monthly</option></select>
            </div>
            <div className={styles.transactionField}>
              <label htmlFor="plannedAmount">Contribution amount</label>
              <div className={styles.transactionAmount}><span aria-hidden="true">₦</span><input id="plannedAmount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={plannedAmount} onChange={(event) => setPlannedAmount(event.target.value)} /></div>
            </div>
            <div className={styles.transactionField}>
              <label htmlFor="dueDate">Target date (optional)</label>
              <input id="dueDate" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
          </div>
          {error && <p className={styles.goalError} role="alert">{error}</p>}
          <div className={styles.transactionField}><label htmlFor="goalPin">Authorize automatic contributions with your transaction PIN</label><input id="goalPin" type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={goalPin} onChange={event => setGoalPin(event.target.value.replace(/\D/g, "").slice(0, 4))} /></div>
          <p className={styles.transactionFootnote}>The first contribution is due {nextContributionDate(localDateValue(), plannedFrequency)}. Each due contribution is deducted from your balance, up to the remaining target. Unfunded contributions wait for a top-up.</p>
          <button className={styles.primaryAction} type="submit" disabled={saving}>{saving ? "Saving…" : "Save goal & enable automatic savings"}</button>
        </form>
      )}

      {mode === "contribution" && (
        <form className={`${styles.panel} ${styles.goalForm}`} onSubmit={saveContribution} noValidate>
          <h2>Make a one-time contribution</h2>
          <div className={styles.goalFormGrid}>
            <div className={styles.transactionField}>
              <label htmlFor="contributionGoal">Savings goal</label>
              <select id="contributionGoal" value={selectedGoalId} onChange={(event) => setSelectedGoalId(event.target.value)}>
                {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name} · {money(goal.targetAmount - goal.savedAmount)} remaining</option>)}
              </select>
            </div>
            <div className={styles.transactionField}>
              <label htmlFor="contributionAmount">Amount to contribute</label>
              <div className={styles.transactionAmount}><span aria-hidden="true">₦</span><input id="contributionAmount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={contributionAmount} onChange={(event) => { setContributionAmount(event.target.value); setError(""); }} /></div>
            </div>
            <div className={styles.transactionField}>
              <label htmlFor="contributionPin">Transaction PIN</label>
              <div className={styles.secretInputWrap}><input id="contributionPin" type={showContributionPin ? "text" : "password"} inputMode="numeric" autoComplete="off" maxLength={4} placeholder="Enter your 4-digit PIN" value={contributionPin} onChange={(event) => { setContributionPin(event.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }} /><button type="button" className={styles.secretToggle} aria-label={showContributionPin ? "Hide PIN" : "Show PIN"} onClick={() => setShowContributionPin((visible) => !visible)}>{showContributionPin ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              <span className={styles.transactionFootnote}>Use the personal PIN you created when setting up your wallet.</span>
            </div>
          </div>
          {error && <p className={styles.goalError} role="alert">{error}</p>}
          <button className={styles.primaryAction} type="submit" disabled={saving}>Save contribution</button>
        </form>
      )}

      {mode === null && error && <p className={styles.goalError} role="alert">{error}</p>}
      {notice && <p className={styles.goalNotice} role="status">{notice}</p>}

      <section className={styles.panel + " " + styles.goalsPanel}>
        <h2>Your goals</h2>
        {goals.length ? (
          <div className={styles.goalList}>
            {goals.map((goal) => {
              const progress = Math.min(100, goal.savedAmount / goal.targetAmount * 100);
              return (
                <article className={styles.goalItem} key={goal.id}>
                  <div className={styles.goalHeading}><strong>{goal.name}</strong><span>{money(goal.savedAmount)} of {money(goal.targetAmount)}</span></div>
                  <div className={styles.progressTrack}><div className={styles.progressBar} style={{ width: `${progress}%` }} /></div>
                  <p>{money(goal.contributionAmount)} {goal.frequency} contribution{goal.dueDate ? ` · due ${new Date(`${goal.dueDate}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>
                  <p>{goal.savedAmount >= goal.targetAmount ? "Target reached" : goal.autoContribute ? `Automatic · next due ${goal.nextContributionDate}` : "Automatic contributions paused"}</p>
                  {goal.savedAmount < goal.targetAmount && <button className={styles.secondaryAction} type="button" disabled={saving} onClick={() => { setError(""); setSchedulePin(""); if (goal.autoContribute) void changeSchedule(goal.id, false); else setScheduleGoalId(goal.id); }}>{goal.autoContribute ? "Pause automatic savings" : "Enable automatic savings"}</button>}
                  {scheduleGoalId === goal.id && <form className={styles.scheduleAuthorization} onSubmit={event => { event.preventDefault(); void changeSchedule(goal.id, true); }}><label htmlFor={`schedule-pin-${goal.id}`}>Transaction PIN</label><input id={`schedule-pin-${goal.id}`} type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={schedulePin} onChange={event => setSchedulePin(event.target.value.replace(/\D/g, "").slice(0, 4))} /><button className={styles.primaryAction} disabled={saving} type="submit">Confirm schedule</button><button className={styles.secondaryAction} type="button" onClick={() => setScheduleGoalId("")}>Cancel</button></form>}

                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyTransactions}>No savings goals yet. Create one to set a target and contribution plan.</p>
        )}
      </section>

      <p className={styles.disclaimer}>Automatic savings run while StudentSave is open and catch up on due contributions when you return. Insufficient funds wait for a top-up. Existing goals need automatic savings enabled. This demo uses your tracked balance and does not move bank funds.</p>
      {successToast && <TransactionSuccessPopup key={successToast.id} message={successToast.message} />}
    </DashboardFrame>
  );
}

export default function SavingsGoalsPage() {
  return <Suspense fallback={null}><SavingsGoalsContent /></Suspense>;
}
