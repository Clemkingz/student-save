"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@repo/supabase/browser";
import { useRefreshFinance, type RpcResult } from "../../../lib/queries/ledger";
import styles from "../dashboard.module.css";

async function fetchNotice() {
  const supabase = createClient();
  const { data } = await supabase.rpc("sim_tick");
  const tick = data as (RpcResult & { blocked?: string[]; contributed?: number; settled?: number }) | null;
  const [{ data: goals }, { data: wallet }] = await Promise.all([
    supabase.from("goal_progress").select("auto_enabled, saved_kobo, target_kobo"),
    supabase.from("wallet_balances").select("balance_kobo").maybeSingle(),
  ]);
  const active = (goals ?? []).some((goal) => goal.auto_enabled && (goal.saved_kobo ?? 0) < (goal.target_kobo ?? 0));
  const blocked = tick?.blocked ?? [];
  return {
    changed: Boolean(tick?.contributed || tick?.settled),
    message: blocked.length
      ? `Automatic contributions are waiting for ${blocked.join(", ")}. Your balance is too low; add funds to resume.`
      : active && wallet?.balance_kobo === 0
        ? "Your balance is empty. Add funds so your scheduled savings contributions can continue."
        : "",
  };
}

export function SavingsAutomation({ email }: { email: string }) {
  const refreshFinance = useRefreshFinance();
  const { data } = useQuery({ queryKey: ["automation-notice", email], queryFn: fetchNotice, enabled: Boolean(email), refetchInterval: 30_000 });
  const changed = data?.changed;
  useEffect(() => {
    if (changed) void refreshFinance();
    // Only react to a new tick that changed something.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changed]);
  return data?.message ? (
    <aside className={styles.savingsBalancePrompt} role="alert">
      <span>{data.message}</span>
      <Link href="/dashboard/add-funds">
        Add funds
      </Link>
    </aside>
  ) : null;
}
