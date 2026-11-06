"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@repo/supabase/browser";
import type { Database } from "@repo/supabase/types";
import type { MockTransaction } from "../../app/dashboard/_components/mockFinance";

type LedgerRow = Database["public"]["Tables"]["transactions"]["Row"];
export type RpcResult = { ok?: boolean; code?: string; replayed?: boolean; transaction_id?: string; [key: string]: unknown };

const creditKinds: LedgerRow["kind"][] = ["income", "opening_balance", "deposit", "goal_withdrawal", "lock_collection", "transfer_reversal"];

const messages: Record<string, string> = {
  pin_incorrect: "That transaction PIN is incorrect.",
  pin_locked: "Too many wrong PIN attempts. Try again in 15 minutes.",
  insufficient_balance: "This is above your available balance. Check the amount and try again.",
  account_not_found: "Account not found. Check the number and try again.",
  invalid_account: "Enter a valid 10-digit account number.",
  invalid_bank: "Choose the recipient’s bank.",
  invalid_amount: "Enter an amount greater than zero.",
  invalid_category: "Choose a category from the list, or describe it in 60 characters or fewer. Names the app uses itself, like Withdrawal, can’t be reused.",
  budget_exists: "A budget for this category already exists this month.",
  budget_exceeds_available: "This exceeds what you have available to budget.",
  ledger_not_empty: "An opening balance can only be the first record.",
  exceeds_goal_target: "This amount exceeds the remaining goal target.",
  goal_unavailable: "This goal is unavailable.",
  goal_is_automatic: "This goal saves automatically. Switch it to manual in contribution settings to add funds yourself.",
  saved_amount_changed: "The saved amount has changed. Close this dialog and review the goal before withdrawing.",
  target_not_reached: "Withdrawal is available once your goal is reached.",
  already_withdrawn: "This goal has already been withdrawn.",
  already_collected: "These savings have already been collected.",
  invalid_start_date: "Choose today or a future start date.",
  invalid_plan: "Choose a lock plan.",
  invalid_name: "Enter a name for your goal.",
  invalid_frequency: "Choose a daily, weekly, or monthly frequency.",
  not_editable: "Only completed income and expenses can be changed.",
  not_found: "This record no longer exists.",
  not_verified: "Your student verification must be approved first.",
  simulation_off: "The simulator is turned off.",
  invalid_days: "Choose 1, 7, or 30 days.",
};

export function rpcMessage(result: RpcResult | null, fallback: string) {
  return (result?.code && messages[result.code]) || fallback;
}

export const toKobo = (naira: number) => Math.round(naira * 100);

function toTransaction(row: LedgerRow): MockTransaction {
  return {
    id: row.id,
    kind: row.kind,
    type: creditKinds.includes(row.kind) ? "income" : "expense",
    amount: row.amount_kobo / 100,
    status: row.status,
    category: row.category,
    date: row.occurred_on,
    note: row.note,
    recipientName: row.recipient_name ?? undefined,
    recipientBank: row.recipient_bank ?? undefined,
    recipientAccountNumber: row.recipient_account_number ?? undefined,
    receiptNumber: row.receipt_number ?? undefined,
    receiptCreatedAt: row.receipt_created_at ?? undefined,
  };
}

async function fetchLedger() {
  const supabase = createClient();
  const { data: tick } = await supabase.rpc("sim_tick");
  const [{ data: rows, error }, { data: wallet }] = await Promise.all([
    supabase.from("transactions").select("*").is("deleted_at", null).order("occurred_on", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("wallet_balances").select("balance_kobo").maybeSingle(),
  ]);
  if (error) throw error;
  const today = (tick as { today?: string } | null)?.today ?? new Date().toISOString().slice(0, 10);
  return { transactions: (rows ?? []).map(toTransaction), balance: (wallet?.balance_kobo ?? 0) / 100, today };
}

// Keyed by user, so a second account in this browser never sees cached rows.
export function useLedger(userId: string) {
  return useQuery({
    queryKey: ["ledger", userId],
    queryFn: fetchLedger,
    enabled: Boolean(userId),
    refetchInterval: (query) => query.state.data?.transactions.some((item) => item.status === "pending") ? 3000 : false,
  });
}

async function fetchBudgets() {
  const { data, error } = await createClient().from("budget_usage").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id ?? "",
    category: row.category ?? "",
    amount: (row.amount_kobo ?? 0) / 100,
    spent: (row.spent_kobo ?? 0) / 100,
    month: (row.month ?? "").slice(0, 7),
  }));
}

export function useBudgets(userId: string) {
  return useQuery({ queryKey: ["budgets", userId], queryFn: fetchBudgets, enabled: Boolean(userId) });
}

export type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  dueDate: string;
  contributionMethod: "auto" | "manual" | "none";
  autoAmount?: number;
  autoFrequency?: "daily" | "weekly" | "monthly";
  autoContribute: boolean;
  nextContributionDate?: string;
  withdrawnAt?: string;
};

async function fetchGoals() {
  const { data, error } = await createClient().from("goal_progress").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row): SavingsGoal => ({
    id: row.id ?? "",
    name: row.name ?? "",
    targetAmount: (row.target_kobo ?? 0) / 100,
    savedAmount: (row.saved_kobo ?? 0) / 100,
    dueDate: row.due_date ?? "",
    contributionMethod: row.contribution_method ?? "none",
    autoAmount: row.auto_amount_kobo === null ? undefined : row.auto_amount_kobo / 100,
    autoFrequency: row.auto_frequency ?? undefined,
    autoContribute: Boolean(row.auto_enabled),
    nextContributionDate: row.next_contribution_on ?? undefined,
    withdrawnAt: row.withdrawn_at ?? undefined,
  }));
}

export function useGoals(userId: string) {
  return useQuery({ queryKey: ["goals", userId], queryFn: fetchGoals, enabled: Boolean(userId) });
}

async function fetchCommitments() {
  const { data, error } = await createClient().from("lock_commitments").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    planMonths: row.plan_months,
    targetAmount: row.target_kobo / 100,
    lockedAmount: row.locked_kobo / 100,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description,
    withdrawnAt: row.withdrawn_at ?? undefined,
    withdrawalFee: row.withdrawal_fee_kobo === null ? undefined : row.withdrawal_fee_kobo / 100,
    withdrawalNet: row.withdrawal_net_kobo === null ? undefined : row.withdrawal_net_kobo / 100,
  }));
}

export function useCommitments(userId: string) {
  return useQuery({ queryKey: ["commitments", userId], queryFn: fetchCommitments, enabled: Boolean(userId) });
}

// Every money action can change the balance, goals, and budgets together.
export function useRefreshFinance() {
  const client = useQueryClient();
  return () => client.invalidateQueries();
}
