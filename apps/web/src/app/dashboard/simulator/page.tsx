"use client";

import { Suspense, useRef, useState, type FormEvent } from "react";
import { createClient } from "@repo/supabase/browser";
import { rpcMessage, toKobo, useRefreshFinance, type RpcResult } from "../../../lib/queries/ledger";
import { useSimulator } from "../../../lib/queries/simulator";
import { DashboardFrame } from "../_components/DashboardFrame";
import { useDashboardSession } from "../_components/useDashboardSession";
import styles from "../dashboard.module.css";
import { PageLoader } from "../../PageLoader";

const statusLabels = { pending: "Pending", success: "Successful", failed: "Failed", reversed: "Reversed" };

function money(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDay(day: string) {
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-NG", { dateStyle: "medium" });
}

function formatTime(time: string) {
  return new Date(time).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

function SimulatorContent() {
  const { userId, email, wallet, ready } = useDashboardSession();
  const { data: simulator } = useSimulator(ready ? userId : "");
  const refreshFinance = useRefreshFinance();
  const busy = useRef(false);
  const transferKey = useRef("");
  const [working, setWorking] = useState(false);
  const [amount, setAmount] = useState("");
  const [sender, setSender] = useState("");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Every action shares one lock, so a double click cannot send two requests.
  async function run(request: () => PromiseLike<{ data: unknown; error: unknown }>, onSuccess: (result: RpcResult) => string) {
    if (busy.current) return false;
    busy.current = true;
    setWorking(true);
    setError("");
    setNotice("");
    const { data, error: rpcError } = await request();
    const result = data as RpcResult | null;
    const succeeded = !rpcError && Boolean(result?.ok);
    await refreshFinance();
    if (succeeded && result) setNotice(onSuccess(result));
    else setError(rpcMessage(result, "The simulator could not do that. Try again."));
    busy.current = false;
    setWorking(false);
    return succeeded;
  }

  async function sendTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    transferKey.current ||= crypto.randomUUID();
    const sent = await run(
      () => createClient().rpc("sim_incoming_transfer", { p_amount: toKobo(numericAmount), p_sender: sender.trim(), p_idempotency_key: transferKey.current }),
      () => "Transfer started. It settles in a few seconds.",
    );
    if (!sent) return;
    transferKey.current = "";
    setAmount("");
    setSender("");
  }

  const settle = (transfer: string, outcome: "success" | "failed") => run(
    () => createClient().rpc("sim_settle_transfer", { p_transfer: transfer, p_outcome: outcome }),
    (result) => result.applied ? (outcome === "success" ? "Transfer settled." : "Transfer failed, and the funds returned.") : "This transfer has already finished.",
  );

  const replay = (event: string) => run(
    () => createClient().rpc("sim_replay_event", { p_event: event }),
    (result) => result.applied ? "The event was applied." : `Event delivered ${String(result.deliveries)} times. Nothing changed.`,
  );

  const advance = (days: number) => run(
    () => createClient().rpc("sim_advance_days", { p_days: days }),
    (result) => {
      const contributed = Number(result.contributed ?? 0);
      const blocked = Array.isArray(result.blocked) ? result.blocked.length : 0;
      return `Date moved to ${formatDay(String(result.today))}. Automatic contributions: ${contributed}.${blocked ? " Some goals need more funds." : ""}`;
    },
  );

  async function reset() {
    await run(() => createClient().rpc("sim_reset_my_data"), () => "Your test data is cleared, and the date is back to today.");
    setConfirmingReset(false);
  }

  if (process.env.NEXT_PUBLIC_SIMULATION_MODE === "false") {
    return <main className={styles.mainContent}>The simulator is turned off.</main>;
  }
  if (!ready || !wallet || !simulator) {
    return <PageLoader message="Loading the simulator…" />;
  }

  return (
    <DashboardFrame email={email} active="Simulator">
      <header className={styles.pageHeading}>
        <h1>Simulator</h1>
        <p>Control the simulated bank and clock. No real money moves.</p>
      </header>

      <section className={styles.fundsSummary} aria-label="Simulator status">
        <div><span>Test wallet balance</span><strong>{money(simulator.balance)}</strong></div>
        <p>Simulated date: {formatDay(simulator.today)}</p>
      </section>

      {error && <p className={styles.goalError} role="alert">{error}</p>}
      {notice && <p className={styles.transactionSaved} role="status">{notice}</p>}

      <div className={styles.fundsContentGrid}>
        <form className={`${styles.panel} ${styles.simSection}`} onSubmit={sendTransfer} noValidate>
          <h2>Incoming transfer</h2>
          <div className={styles.transactionField}>
            <label htmlFor="simAmount">Amount</label>
            <div className={styles.transactionAmount}><span aria-hidden="true">₦</span><input id="simAmount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
          </div>
          <div className={styles.transactionField}>
            <label htmlFor="simSender">Sender name (optional)</label>
            <input id="simSender" type="text" maxLength={60} placeholder="e.g. Test Sender" value={sender} onChange={(event) => setSender(event.target.value)} />
          </div>
          <button className={styles.primaryAction} type="submit" disabled={working} aria-busy={working}>Send transfer</button>
        </form>

        <div className={styles.simSection}>
          <section className={`${styles.panel} ${styles.simSection}`}>
            <h2>Advance time</h2>
            <p>Runs anything due, such as automatic savings. Time only moves forward.</p>
            <div className={styles.simActions}>{[1, 7, 30].map((days) => <button className={styles.secondaryAction} type="button" disabled={working} onClick={() => void advance(days)} key={days}>{days === 1 ? "1 day" : `${days} days`}</button>)}</div>
          </section>
          <section className={`${styles.panel} ${styles.simSection}`}>
            <h2>Reset my data</h2>
            <p>Clears your transactions, goals, budgets, and locks, and returns the date to today. Your account stays.</p>
            <div className={styles.simActions}>
              {confirmingReset
                ? <><button className={styles.primaryAction} type="button" disabled={working} aria-busy={working} onClick={() => void reset()}>Yes, clear my data</button><button className={styles.secondaryAction} type="button" disabled={working} onClick={() => setConfirmingReset(false)}>Cancel</button></>
                : <button className={styles.secondaryAction} type="button" disabled={working} onClick={() => setConfirmingReset(true)}>Reset my data</button>}
            </div>
          </section>
        </div>
      </div>

      <section className={styles.panel}>
        <h2>Activity log</h2>
        {simulator.transfers.length === 0 ? <p>No simulated transfers yet.</p> : (
          <ol className={styles.simLog}>
            {simulator.transfers.map((transfer) => (
              <li key={transfer.id}>
                <div className={styles.simLogHeading}>
                  <strong>{transfer.direction === "incoming" ? "From" : "To"} {transfer.counterparty} · {money(transfer.amount_kobo / 100)}</strong>
                  <span>{statusLabels[transfer.status]} · {formatTime(transfer.created_at)}</span>
                </div>
                {transfer.status === "pending" && (
                  <div className={styles.simActions}>
                    <button className={styles.secondaryAction} type="button" disabled={working} onClick={() => void settle(transfer.id, "success")}>Settle now</button>
                    <button className={styles.secondaryAction} type="button" disabled={working} onClick={() => void settle(transfer.id, "failed")}>Fail transfer</button>
                  </div>
                )}
                {simulator.events.filter((item) => item.transfer_id === transfer.id).map((item) => (
                  <div className={styles.simEvent} key={item.id}>
                    <span>{statusLabels[item.event_type]} event · {formatTime(item.processed_at)} · delivered {item.deliveries} {item.deliveries === 1 ? "time" : "times"}</span>
                    <button className={styles.secondaryAction} type="button" disabled={working} onClick={() => void replay(item.id)}>Replay event</button>
                  </div>
                ))}
              </li>
            ))}
          </ol>
        )}
      </section>
    </DashboardFrame>
  );
}

export default function SimulatorPage() {
  return <Suspense fallback={null}><SimulatorContent /></Suspense>;
}
