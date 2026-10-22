"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { financeEvent } from "./financeStorage";
import { runSavingsAutomation } from "./runSavingsAutomation";
import styles from "../dashboard.module.css";

export function SavingsAutomation({ email }: { email: string }) {
  const [message, setMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void runSavingsAutomation(email)
        .then((result) => {
          if (cancelled) return;
          const active = result.goals.some(
            (goal) =>
              goal.autoContribute && goal.savedAmount < goal.targetAmount,
          );
          setMessage(
            result.blocked.length
              ? `Automatic contributions are waiting for ${result.blocked.join(", ")}. Your balance is too low; add funds to resume.`
              : active && result.balance === 0
                ? "Your balance is empty. Add funds so your scheduled savings contributions can continue."
                : "",
          );
        })
        .catch(() => {
          if (!cancelled)
            setMessage(
              "Automatic savings could not be processed. Check browser storage and reload to try again.",
            );
        });
    };
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener(financeEvent, refresh);
    window.addEventListener("focus", refresh);
    const onStorage = (event: StorageEvent) => {
      if (event.key?.endsWith(`:${email}`) || event.key === null) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener(financeEvent, refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [email]);
  return message ? (
    <aside className={styles.savingsBalancePrompt} role="alert">
      <span>{message}</span>
      <Link href={`/dashboard/add-funds?email=${encodeURIComponent(email)}`}>
        Add funds
      </Link>
    </aside>
  ) : null;
}
