import { test } from "node:test";
import { strict as assert } from "node:assert";
import { isSuccessfulCredit, type MockTransaction } from "./mockFinance";

const credit: MockTransaction = { id: "credit", kind: "income", type: "income", amount: 5000, status: "completed", category: "Allowance", date: "2026-10-26", note: "" };

test("only completed funds added count as successful credits", () => {
  for (const kind of ["income", "opening_balance", "deposit"]) assert.equal(isSuccessfulCredit({ ...credit, kind }), true);
  for (const status of ["pending", "failed"] as const) assert.equal(isSuccessfulCredit({ ...credit, status }), false);
  for (const kind of ["expense", "goal_contribution", "goal_withdrawal", "lock_collection", "transfer_reversal"]) assert.equal(isSuccessfulCredit({ ...credit, kind }), false);
});
