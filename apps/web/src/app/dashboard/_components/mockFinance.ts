import { recoverFinance } from "./financeStorage";

export type MockTransaction = {
  id: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  date: string;
  note: string;
  recipientName?: string;
  recipientBank?: string;
  recipientAccountNumber?: string;
  receiptNumber?: string;
  receiptCreatedAt?: string;
};

export function localDateValue(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function getMockTransactions(email: string): MockTransaction[] {
  recoverFinance(email);
  const storageKey = `studentsave:transactions:${email}`;
  const resetKey = `studentsave:mock-finance-reset-v1:${email}`;

  // Clear the old seeded test figures once for each account. New finance data
  // entered after this reset is preserved in local storage.
  if (!localStorage.getItem(resetKey)) {
    [
      storageKey,
      `studentsave:budgets:${email}`,
      `studentsave:savings-goals:${email}`,
      `studentsave:savings-contributions:${email}`,
      `studentsave:lock-commitments:${email}`,
      `studentsave:reports-dismissed:${email}`,
      `studentsave:mock-balance-initialized:${email}`,
    ].forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(resetKey, "true");
  }

  const saved = localStorage.getItem(storageKey);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved) as MockTransaction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(storageKey);
    return [];
  }
}
