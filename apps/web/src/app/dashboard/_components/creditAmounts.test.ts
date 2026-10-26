import { test } from "node:test";
import { strict as assert } from "node:assert";
import { isSuccessfulCredit, type MockTransaction } from "./mockFinance";

const credit: MockTransaction = { id: "credit", type: "income", amount: 5000, category: "Allowance", date: "2026-10-26", note: "" };

test("only completed wallet credits receive success ink, including legacy records", () => {
  for (const status of [undefined, "success", "completed"] as const) assert.equal(isSuccessfulCredit({ ...credit, status }), true);
  for (const status of ["pending", "failed"] as const) assert.equal(isSuccessfulCredit({ ...credit, status }), false);
  assert.equal(isSuccessfulCredit({ ...credit, type: "expense" }), false);
  assert.equal(isSuccessfulCredit({ ...credit, type: "expense", category: "Savings contribution" }), false);
  assert.equal(isSuccessfulCredit({ ...credit, category: "Lock Savings Withdrawal" }), false);
  assert.equal(isSuccessfulCredit({ ...credit, category: "Savings Goal Withdrawal" }), false);
});
