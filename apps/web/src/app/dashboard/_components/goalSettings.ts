import {
  cents,
  nextContributionDate,
  normalizeSavingsGoal,
  type ContributionMethod,
  type Frequency,
  type SavingsGoal,
} from "./savingsAutomation";
import type { MockTransaction } from "./mockFinance";

export type ContributionSettings = {
  contributionMethod: ContributionMethod;
  autoAmount?: number;
  autoFrequency?: Frequency;
};

export function contributionSettingsFor(goal: SavingsGoal): ContributionSettings {
  const current = normalizeSavingsGoal(goal);
  return {
    contributionMethod: current.contributionMethod ?? "none",
    autoAmount: current.autoAmount,
    autoFrequency: current.autoFrequency,
  };
}

export function configureGoalContributions(
  goal: SavingsGoal,
  settings: ContributionSettings,
  today: string,
): SavingsGoal {
  if (goal.withdrawnAt) throw new Error("This goal has already been withdrawn.");
  if (!["auto", "manual", "none"].includes(settings.contributionMethod))
    throw new Error("Choose a valid contribution method.");
  const automatic = settings.contributionMethod === "auto";
  if (automatic) {
    if (!Number.isFinite(settings.autoAmount) || cents(settings.autoAmount ?? 0) < 1)
      throw new Error("Enter an automatic contribution amount of at least ₦0.01.");
    if (!settings.autoFrequency || !["daily", "weekly", "monthly"].includes(settings.autoFrequency))
      throw new Error("Choose a daily, weekly, or monthly frequency.");
  }
  const amount = automatic ? cents(settings.autoAmount!) / 100 : undefined;
  const frequency = automatic ? settings.autoFrequency! : undefined;
  return {
    ...goal,
    contributionMethod: settings.contributionMethod,
    autoAmount: amount,
    autoFrequency: frequency,
    // Keep the existing scheduler fields in sync for older readers.
    contributionAmount: amount ?? 0,
    frequency: frequency ?? goal.frequency,
    autoContribute: automatic,
    nextContributionDate: frequency ? nextContributionDate(today, frequency) : undefined,
    scheduleDay: frequency ? Number(today.slice(8, 10)) : undefined,
  };
}

export function canWithdrawGoal(goal: SavingsGoal) {
  return !goal.withdrawnAt && Number.isFinite(goal.savedAmount) &&
    Number.isFinite(goal.targetAmount) && cents(goal.targetAmount) > 0 &&
    cents(goal.savedAmount) >= cents(goal.targetAmount);
}

// The operation validates fresh records, independently of the button's state.
// Use a deterministic ledger ID as a second guard against duplicate payouts.
export function applyGoalWithdrawal(
  goals: SavingsGoal[],
  transactions: MockTransaction[],
  goalId: string,
  now: string,
) {
  const goal = goals.find((item) => item.id === goalId);
  if (!goal) throw new Error("Savings goal not found.");
  const id = `goal-withdrawal:${goal.id}`;
  if (goal.withdrawnAt || transactions.some((item) => item.id === id))
    throw new Error("This goal has already been withdrawn.");
  if (!canWithdrawGoal(goal))
    throw new Error("Withdrawal is available once your goal is reached.");
  const amount = cents(goal.savedAmount) / 100;
  const transaction: MockTransaction = {
    id, type: "income", amount, category: "Savings withdrawal",
    date: now.slice(0, 10), note: `Withdrawal from ${goal.name}`,
  };
  return {
    amount,
    goals: goals.map((item) => item.id === goal.id ? {
      ...normalizeSavingsGoal(item), withdrawnAt: now, withdrawalAmount: amount,
      autoContribute: false, nextContributionDate: undefined,
    } : item),
    transactions: [transaction, ...transactions],
  };
}
