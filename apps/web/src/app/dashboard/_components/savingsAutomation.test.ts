import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  applyDueContributions,
  nextContributionDate,
  walletCents,
  type SavingsGoal,
} from "./savingsAutomation";
import type { MockTransaction } from "./mockFinance";

const goal = (overrides: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: "goal",
  name: "Laptop",
  targetAmount: 100,
  savedAmount: 0,
  contributionAmount: 30,
  frequency: "daily",
  dueDate: "",
  createdAt: "2026-10-20",
  autoContribute: true,
  nextContributionDate: "2026-10-21",
  scheduleDay: 20,
  ...overrides,
});
const funds = (amount: number): MockTransaction[] => [
  {
    id: "income",
    type: "income",
    amount,
    category: "Allowance",
    date: "2026-10-20",
    note: "",
  },
];

test("catches up due periods once and caps the last contribution at the target", () => {
  const result = applyDueContributions([goal()], [], funds(150), "2026-10-25");
  assert.equal(result.goals[0]?.savedAmount, 100);
  assert.deepEqual(
    result.contributions.map((item) => item.amount),
    [10, 30, 30, 30],
  );
  assert.equal(walletCents(result.transactions), 5000);
  const again = applyDueContributions(
    result.goals,
    result.contributions,
    result.transactions,
    "2026-10-25",
  );
  assert.equal(again.changed, false);
  assert.equal(again.transactions.length, 5);
});

test("insufficient balance leaves the due date pending and resumes after a top-up", () => {
  const result = applyDueContributions([goal()], [], funds(20), "2026-10-21");
  assert.deepEqual(result.blocked, ["Laptop"]);
  assert.equal(result.goals[0]?.nextContributionDate, "2026-10-21");
  assert.equal(result.contributions.length, 0);
  const resumed = applyDueContributions(
    result.goals,
    result.contributions,
    [...funds(30), ...result.transactions],
    "2026-10-21",
  );
  assert.equal(resumed.goals[0]?.savedAmount, 30);
  assert.equal(walletCents(resumed.transactions), 2000);
});

test("multiple goals share one balance without overdrawing it", () => {
  const result = applyDueContributions(
    [goal(), goal({ id: "other", name: "Rent" })],
    [],
    funds(40),
    "2026-10-21",
  );
  assert.equal(result.contributions.length, 1);
  assert.equal(result.balance, 10);
  assert.deepEqual(result.blocked, ["Rent"]);
});

test("future and paused schedules never debit the balance", () => {
  const result = applyDueContributions(
    [
      goal({ autoContribute: false }),
      goal({ id: "future", nextContributionDate: "2026-11-01" }),
    ],
    [],
    funds(100),
    "2026-10-21",
  );
  assert.equal(result.changed, false);
  assert.equal(result.balance, 100);
});

test("monthly schedules clamp short months and return to the anchored day", () => {
  assert.equal(nextContributionDate("2026-01-31", "monthly", 31), "2026-02-28");
  assert.equal(nextContributionDate("2026-02-28", "monthly", 31), "2026-03-31");
  assert.equal(nextContributionDate("2028-01-31", "monthly", 31), "2028-02-29");
  assert.equal(nextContributionDate("2026-12-31", "daily"), "2027-01-01");
});

test("legacy contributions enter the wallet ledger once without changing goal progress", () => {
  const contributions = [
    {
      id: "legacy",
      goalId: "goal",
      amount: 20,
      frequency: "daily" as const,
      date: "2026-10-20",
      createdAt: "2026-10-20",
    },
  ];
  const first = applyDueContributions(
    [goal({ autoContribute: false, savedAmount: 20 })],
    contributions,
    funds(100),
    "2026-10-21",
  );
  assert.equal(first.balance, 80);
  assert.equal(first.goals[0]?.savedAmount, 20);
  const again = applyDueContributions(
    first.goals,
    first.contributions,
    first.transactions,
    "2026-10-21",
  );
  assert.equal(again.changed, false);
  assert.equal(again.balance, 80);
});

test("sub-unit contributions use integer cents", () => {
  const result = applyDueContributions(
    [goal({ targetAmount: 0.03, contributionAmount: 0.01 })],
    [],
    funds(0.03),
    "2026-10-23",
  );
  assert.equal(result.balance, 0);
  assert.equal(result.goals[0]?.savedAmount, 0.03);
});
