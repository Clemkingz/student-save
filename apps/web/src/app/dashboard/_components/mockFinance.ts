export type MockTransaction = {
  id: string;
  kind: string;
  type: "expense" | "income";
  amount: number;
  status: "completed" | "pending" | "failed";
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

export function isSuccessfulCredit(transaction: MockTransaction) {
  return ["income", "opening_balance", "deposit"].includes(transaction.kind) && transaction.status === "completed";
}
