import type { MockTransaction } from "./mockFinance";

export type Frequency = "daily" | "monthly";
export type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  contributionAmount: number;
  frequency: Frequency;
  dueDate: string;
  createdAt: string;
  autoContribute?: boolean;
  nextContributionDate?: string;
  scheduleDay?: number;
};
export type SavingsContribution = {
  id: string;
  goalId: string;
  amount: number;
  frequency: Frequency;
  date: string;
  createdAt: string;
  transactionId?: string;
};
export const cents = (value: number) => Math.round(value * 100);
export const walletCents = (transactions: MockTransaction[]) =>
  transactions.reduce(
    (sum, item) =>
      sum + (item.type === "income" ? cents(item.amount) : -cents(item.amount)),
    0,
  );

export function nextContributionDate(
  value: string,
  frequency: Frequency,
  anchorDay = Number(value.slice(8, 10)),
) {
  const date = new Date(`${value}T12:00:00`);
  if (frequency === "daily") date.setDate(date.getDate() + 1);
  else {
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    date.setDate(
      Math.min(
        anchorDay,
        new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
      ),
    );
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function applyDueContributions(
  goals: SavingsGoal[],
  contributions: SavingsContribution[],
  transactions: MockTransaction[],
  today: string,
) {
  const nextGoals = goals.map((goal) => ({ ...goal }));
  const nextContributions = [...contributions];
  const nextTransactions = [...transactions];
  const transactionIds = new Set(transactions.map((item) => item.id));
  const blocked: string[] = [];
  let changed = false;

  // Older contributions were reserved only on the goals page. Put them in the
  // common ledger once so every page uses the same available balance.
  for (const contribution of nextContributions) {
    const id =
      contribution.transactionId || `savings-contribution:${contribution.id}`;
    if (transactionIds.has(id)) continue;
    if (
      !Number.isFinite(contribution.amount) ||
      cents(contribution.amount) <= 0
    )
      continue;
    nextTransactions.unshift({
      id,
      type: "expense",
      amount: contribution.amount,
      category: "Savings contribution",
      date: contribution.date.slice(0, 10),
      note: `Contribution to ${goals.find((goal) => goal.id === contribution.goalId)?.name || "savings goal"}`,
    });
    transactionIds.add(id);
    changed = true;
  }
  let balance = walletCents(nextTransactions);
  for (const goal of nextGoals) {
    if (
      !goal.autoContribute ||
      !Number.isFinite(goal.contributionAmount) ||
      cents(goal.contributionAmount) <= 0 ||
      !Number.isFinite(goal.targetAmount) ||
      !Number.isFinite(goal.savedAmount)
    )
      continue;
    if (
      !goal.nextContributionDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(goal.nextContributionDate)
    )
      continue;
    while (
      goal.nextContributionDate <= today &&
      cents(goal.savedAmount) < cents(goal.targetAmount)
    ) {
      const amount = Math.min(
        cents(goal.contributionAmount),
        cents(goal.targetAmount) - cents(goal.savedAmount),
      );
      if (amount > balance) {
        blocked.push(goal.name);
        break;
      }
      const due = goal.nextContributionDate;
      const id = `goal-auto:${goal.id}:${due}`;
      if (!transactionIds.has(id)) {
        nextTransactions.unshift({
          id,
          type: "expense",
          amount: amount / 100,
          category: "Savings contribution",
          date: today,
          note: `Automatic contribution to ${goal.name} · scheduled ${due}`,
        });
        nextContributions.unshift({
          id,
          transactionId: id,
          goalId: goal.id,
          amount: amount / 100,
          frequency: goal.frequency,
          date: today,
          createdAt: new Date().toISOString(),
        });
        transactionIds.add(id);
        goal.savedAmount = (cents(goal.savedAmount) + amount) / 100;
        balance -= amount;
      }
      goal.nextContributionDate = nextContributionDate(
        due,
        goal.frequency,
        goal.scheduleDay,
      );
      changed = true;
    }
  }
  return {
    goals: nextGoals,
    contributions: nextContributions,
    transactions: nextTransactions,
    blocked,
    balance: Math.max(0, balance) / 100,
    changed,
  };
}
