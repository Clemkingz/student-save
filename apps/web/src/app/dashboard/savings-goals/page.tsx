"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { DashboardFrame } from "../_components/DashboardFrame";
import { TransactionSuccessPopup } from "../_components/TransactionSuccessPopup";
import { getMockTransactions } from "../_components/mockFinance";
import { verifyTransactionPin } from "../_components/transactionPin";
import { useDashboardSession } from "../_components/useDashboardSession";
import styles from "../dashboard.module.css";

type Frequency = "daily" | "monthly";
type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  contributionAmount: number;
  frequency: Frequency;
  dueDate: string;
  createdAt: string;
};
type Contribution = { id: string; goalId: string; amount: number; frequency: Frequency; date: string; createdAt: string };

const goalOptions = ["Laptop", "Textbook", "Phone", "Bag", "FYB payment", "Tuition", "Accommodation", "Travel", "Emergency fund", "Custom goal"];

function money(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function SavingsGoalsContent() {
  const { email, ready } = useDashboardSession();
  const goalsKey = `studentsave:savings-goals:${email}`;
  const contributionsKey = `studentsave:savings-contributions:${email}`;
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
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
  const [contributionFrequency, setContributionFrequency] = useState<Frequency>("monthly");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [successToast, setSuccessToast] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    if (!ready || !email) return;
    const transactions = getMockTransactions(email);
    const income = transactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = transactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);
    setBalance(Math.max(0, income - expenses));

    const storedGoals = localStorage.getItem(goalsKey);
    if (storedGoals) {
      try {
        const parsed = JSON.parse(storedGoals) as Goal[];
        setGoals(Array.isArray(parsed) ? parsed : []);
      } catch {
        localStorage.removeItem(goalsKey);
      }
    }
    const storedContributions = localStorage.getItem(contributionsKey);
    if (storedContributions) {
      try {
        const parsed = JSON.parse(storedContributions) as Contribution[];
        setContributions(Array.isArray(parsed) ? parsed : []);
      } catch {
        localStorage.removeItem(contributionsKey);
      }
    }
  }, [contributionsKey, email, goalsKey, ready]);

  const totalContributed = contributions.reduce((sum, contribution) => sum + contribution.amount, 0);
  const availableBalance = Math.max(0, balance - totalContributed);

  function openForm(nextMode: "goal" | "contribution") {
    setMode(nextMode);
    setError("");
    setNotice("");
    if (nextMode === "contribution" && goals[0]) setSelectedGoalId(goals[0].id);
  }

  function saveGoal(event: FormEvent<HTMLFormElement>) {
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

    const goal: Goal = {
      id: crypto.randomUUID(),
      name,
      targetAmount: Math.round(target * 100) / 100,
      savedAmount: 0,
      contributionAmount: Math.round(planned * 100) / 100,
      frequency: plannedFrequency,
      dueDate,
      createdAt: new Date().toISOString(),
    };
    const nextGoals = [goal, ...goals];
    localStorage.setItem(goalsKey, JSON.stringify(nextGoals));
    setGoals(nextGoals);
    setSelectedGoalId(goal.id);
    setTargetAmount("");
    setPlannedAmount("");
    setCustomName("");
    setError("");
    setNotice(`${name} goal created.`);
    setMode(null);
  }

  async function saveContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const goal = goals.find((item) => item.id === selectedGoalId);
    const amount = Number(contributionAmount);
    if (!goal) {
      setError("Choose a savings goal.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a contribution amount greater than zero.");
      return;
    }
    const roundedAmount = Math.round(amount * 100) / 100;
    if (roundedAmount > availableBalance) {
      setError(`You can contribute up to ${money(availableBalance)} from your current tracked balance.`);
      return;
    }
    if (roundedAmount > goal.targetAmount - goal.savedAmount) {
      setError(`This goal needs only ${money(goal.targetAmount - goal.savedAmount)} more to reach its target.`);
      return;
    }
    if (!/^\d{4}$/.test(contributionPin)) {
      setError("Enter your 4-digit transaction PIN to confirm this contribution.");
      return;
    }
    if (!(await verifyTransactionPin(email, contributionPin))) {
      setError("That transaction PIN is incorrect.");
      return;
    }

    const contribution: Contribution = {
      id: crypto.randomUUID(),
      goalId: goal.id,
      amount: roundedAmount,
      frequency: contributionFrequency,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const nextContributions = [contribution, ...contributions];
    const nextGoals = goals.map((item) => item.id === goal.id ? { ...item, savedAmount: item.savedAmount + roundedAmount } : item);
    localStorage.setItem(contributionsKey, JSON.stringify(nextContributions));
    localStorage.setItem(goalsKey, JSON.stringify(nextGoals));
    setContributions(nextContributions);
    setGoals(nextGoals);
    setContributionAmount("");
    setContributionPin("");
    setError("");
    setNotice(`${money(roundedAmount)} added to ${goal.name}.`);
    setSuccessToast({ id: crypto.randomUUID(), message: "Savings contribution successful!" });
    setMode(null);
  }

  if (!ready) return <main className={styles.mainContent} aria-live="polite">Loading savings goals…</main>;

  return (
    <DashboardFrame email={email} active="Savings Goals">
      <header className={styles.pageHeading}>
        <h1>Savings goals</h1>
        <p>Set a target and record contributions manually.</p>
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
          <button className={styles.primaryAction} type="submit">Save goal</button>
        </form>
      )}

      {mode === "contribution" && (
        <form className={`${styles.panel} ${styles.goalForm}`} onSubmit={saveContribution} noValidate>
          <h2>Record a contribution</h2>
          <div className={styles.goalFormGrid}>
            <div className={styles.transactionField}>
              <label htmlFor="contributionGoal">Savings goal</label>
              <select id="contributionGoal" value={selectedGoalId} onChange={(event) => setSelectedGoalId(event.target.value)}>
                {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name} · {money(goal.targetAmount - goal.savedAmount)} remaining</option>)}
              </select>
            </div>
            <div className={styles.transactionField}>
              <label htmlFor="contributionFrequency">Contribution schedule</label>
              <select id="contributionFrequency" value={contributionFrequency} onChange={(event) => setContributionFrequency(event.target.value as Frequency)}><option value="daily">Daily</option><option value="monthly">Monthly</option></select>
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
          <button className={styles.primaryAction} type="submit">Save contribution</button>
        </form>
      )}

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
                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyTransactions}>No savings goals yet. Create one to set a target and contribution plan.</p>
        )}
      </section>

      <p className={styles.disclaimer}>Contributions are recorded manually in this demo and count against your tracked balance. They do not move money from a bank account.</p>
      {successToast && <TransactionSuccessPopup key={successToast.id} message={successToast.message} />}
    </DashboardFrame>
  );
}

export default function SavingsGoalsPage() {
  return <Suspense fallback={null}><SavingsGoalsContent /></Suspense>;
}
