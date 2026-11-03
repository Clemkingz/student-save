"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@repo/supabase/browser";

async function fetchSimulator() {
  const supabase = createClient();
  const { data: tick } = await supabase.rpc("sim_tick");
  const [{ data: transfers, error }, { data: events }, { data: wallet }] = await Promise.all([
    supabase.from("sim_transfers").select("*").order("created_at", { ascending: false }),
    supabase.from("sim_events").select("*").order("processed_at"),
    supabase.from("wallet_balances").select("balance_kobo").maybeSingle(),
  ]);
  if (error) throw error;
  const today = (tick as { today?: string } | null)?.today ?? new Date().toISOString().slice(0, 10);
  return { transfers: transfers ?? [], events: events ?? [], balance: (wallet?.balance_kobo ?? 0) / 100, today };
}

export function useSimulator(userId: string) {
  return useQuery({
    queryKey: ["simulator", userId],
    queryFn: fetchSimulator,
    enabled: Boolean(userId),
    // Held transfers have no settle time, so they wait for a tester instead of polling.
    refetchInterval: (query) => query.state.data?.transfers.some((item) => (item.status === "pending" && item.settle_after) || (item.status === "success" && item.reverse_after)) ? 2000 : false,
  });
}
