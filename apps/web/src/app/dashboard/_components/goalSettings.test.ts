import { test } from "node:test";
import { strict as assert } from "node:assert";
import { applyGoalWithdrawal, canWithdrawGoal, configureGoalContributions, contributionSettingsFor } from "./goalSettings";
import { applyDueContributions, type SavingsGoal, type Frequency } from "./savingsAutomation";

const goal = (overrides: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: "goal", name: "Laptop", targetAmount: 100, savedAmount: 0,
  contributionAmount: 0, frequency: "monthly", contributionMethod: "none",
  dueDate: "", createdAt: "2026-10-23", ...overrides,
});

test("a new/skipped goal stays valid without contribution settings or a schedule", () => {
  const original = goal();
  assert.deepEqual(contributionSettingsFor(original), {
    contributionMethod: "none", autoAmount: undefined, autoFrequency: undefined,
  });
  const result = applyDueContributions([original], [], [], "2026-11-23");
  assert.equal(result.changed, false);
  assert.equal(result.goals[0]?.contributionMethod, "none");
  assert.equal(result.contributions.length, 0);
});

test("automatic settings reject missing, zero, negative, nonfinite and sub-kobo amounts", () => {
  for (const autoAmount of [undefined, 0, -1, NaN, Infinity, 0.001]) {
    assert.throws(() => configureGoalContributions(goal(), {
      contributionMethod: "auto", autoAmount, autoFrequency: "weekly",
    }, "2026-10-23"), /amount/);
  }
});

test("automatic settings require a supported frequency", () => {
  for (const autoFrequency of [undefined, "yearly" as Frequency]) {
    assert.throws(() => configureGoalContributions(goal(), {
      contributionMethod: "auto", autoAmount: 10, autoFrequency,
    }, "2026-10-23"), /frequency/);
  }
});

test("saving and reopening automatic settings retains amount/frequency and schedules next period", () => {
  const updated = configureGoalContributions(goal(), {
    contributionMethod: "auto", autoAmount: 10.25, autoFrequency: "weekly",
  }, "2026-10-23");
  assert.deepEqual(contributionSettingsFor(updated), {
    contributionMethod: "auto", autoAmount: 10.25, autoFrequency: "weekly",
  });
  assert.equal(updated.autoContribute, true);
  assert.equal(updated.nextContributionDate, "2026-10-30");
  assert.equal(updated.contributionAmount, 10.25);
  assert.equal(updated.frequency, "weekly");
});

test("switching to manual or none clears automatic settings and preserves saved progress", () => {
  const automatic = configureGoalContributions(goal({ savedAmount: 50 }), {
    contributionMethod: "auto", autoAmount: 10, autoFrequency: "daily",
  }, "2026-10-23");
  for (const contributionMethod of ["manual", "none"] as const) {
    const result = configureGoalContributions(automatic, { contributionMethod }, "2026-10-23");
    assert.equal(result.savedAmount, 50);
    assert.equal(result.contributionMethod, contributionMethod);
    assert.equal(result.autoContribute, false);
    assert.equal(result.autoAmount, undefined);
    assert.equal(result.autoFrequency, undefined);
    assert.equal(result.nextContributionDate, undefined);
  }
});

test("legacy automatic settings reopen without losing their schedule", () => {
  const result = contributionSettingsFor(goal({
    contributionMethod: undefined, autoContribute: true,
    contributionAmount: 15, frequency: "daily",
  }));
  assert.deepEqual(result, { contributionMethod: "auto", autoAmount: 15, autoFrequency: "daily" });
});

test("business logic rejects early withdrawals independently of the disabled button", () => {
  const original = goal({ savedAmount: 99.99 });
  assert.equal(canWithdrawGoal(original), false);
  assert.throws(() => applyGoalWithdrawal([original], [], original.id, "2026-10-23T12:00:00Z"), /once your goal is reached/);
  assert.equal(original.savedAmount, 99.99);
  assert.equal(original.withdrawnAt, undefined);
});

test("reached or exceeded goals return the full saved amount once and stop automation", () => {
  for (const savedAmount of [100, 125.75]) {
    const original = goal({ savedAmount, autoContribute: true });
    assert.equal(canWithdrawGoal(original), true);
    const result = applyGoalWithdrawal([original], [], original.id, "2026-10-23T12:00:00Z");
    assert.equal(result.amount, savedAmount);
    assert.equal(result.transactions[0]?.amount, savedAmount);
    assert.equal(result.transactions[0]?.type, "income");
    assert.equal(result.transactions[0]?.id, "goal-withdrawal:goal");
    assert.equal(result.goals[0]?.autoContribute, false);
    assert.equal(result.goals[0]?.withdrawalAmount, savedAmount);
    assert.equal(canWithdrawGoal(result.goals[0]!), false);
    assert.throws(() => applyGoalWithdrawal(result.goals, result.transactions, original.id, "2026-10-24T12:00:00Z"), /already been withdrawn/);
    assert.equal(original.withdrawnAt, undefined);
  }
});

test("the ledger also prevents double withdrawal with a stale goal record", () => {
  const original = goal({ savedAmount: 100 });
  const first = applyGoalWithdrawal([original], [], original.id, "2026-10-23T12:00:00Z");
  assert.throws(() => applyGoalWithdrawal([original], first.transactions, original.id, "2026-10-23T12:00:00Z"), /already been withdrawn/);
});

test("unknown goals, invalid amounts and withdrawn settings are rejected", () => {
  assert.throws(() => applyGoalWithdrawal([], [], "missing", "2026-10-23"), /not found/);
  for (const invalid of [goal({ targetAmount: 0 }), goal({ savedAmount: NaN }), goal({ savedAmount: Infinity }), goal({ targetAmount: Infinity })]) {
    assert.equal(canWithdrawGoal(invalid), false);
    assert.throws(() => applyGoalWithdrawal([invalid], [], invalid.id, "2026-10-23"), /once your goal is reached/);
  }
  assert.throws(() => configureGoalContributions(goal({ withdrawnAt: "2026-10-23" }), { contributionMethod: "manual" }, "2026-10-23"), /already been withdrawn/);
});
