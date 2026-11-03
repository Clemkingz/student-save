"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { createClient } from "@repo/supabase/browser";
import { rpcMessage, toKobo, useRefreshFinance, type RpcResult, type SavingsGoal } from "../../../lib/queries/ledger";
import styles from "../dashboard.module.css";

export function ManualContribution({ goal, balance }: { goal: SavingsGoal; balance: number }) {
  const [amount, setAmount] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const attemptKey = useRef("");
  const refreshFinance = useRefreshFinance();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<number | null>(null);
  const numeric = Number(amount);
  const valid = Number.isFinite(numeric) && Number.isSafeInteger(toKobo(numeric)) && numeric >= .01 && toKobo(numeric) <= toKobo(Math.min(balance, goal.targetAmount - goal.savedAmount));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || busy.current) return;
    busy.current = true; setSaving(true); setError(""); setSuccess(null);
    attemptKey.current ||= crypto.randomUUID();
    const { data, error: rpcError } = await createClient().rpc("contribute_to_goal", { p_goal: goal.id, p_amount: toKobo(numeric), p_pin: pin, p_idempotency_key: attemptKey.current });
    const result = data as RpcResult | null;
    if (rpcError || !result?.ok) {
      setError(rpcMessage(result, "Could not save contribution."));
    } else {
      attemptKey.current = "";
      await refreshFinance();
      setSuccess(numeric); setAmount(""); setPin("");
    }
    busy.current = false; setSaving(false);
  }
  return <form className={`${styles.panel} ${styles.manualContribution}`} onSubmit={submit} noValidate>
    <h3>{goal.name}</h3>
    <div className={styles.transactionField}><label htmlFor={`amount-${goal.id}`}>Amount to contribute (₦)</label><input id={`amount-${goal.id}`} type="number" inputMode="decimal" min="0.01" max={Math.min(balance, goal.targetAmount-goal.savedAmount)} step="0.01" value={amount} onChange={event => { setAmount(event.target.value); setError(""); }} disabled={saving} aria-invalid={amount !== "" && !valid} /></div>
    {amount !== "" && !valid && <p className={styles.goalError}>Enter at least ₦0.01, within your balance and remaining target.</p>}
    <div className={styles.transactionField}><label htmlFor={`pin-${goal.id}`}>Transaction PIN</label><div className={styles.secretInputWrap}><input id={`pin-${goal.id}`} type={showPin ? "text" : "password"} inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, "").slice(0,4))} disabled={saving} /><button className={styles.secretToggle} type="button" aria-label={showPin ? "Hide PIN" : "Show PIN"} onClick={() => setShowPin(visible => !visible)}>{showPin ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><span className={styles.transactionFootnote}>Use the personal PIN you created when setting up your wallet.</span></div>
    {error && <p role="alert" className={styles.goalError}>{error}</p>}
    {success !== null && <p role="status"><strong className="funds-added-amount">+₦{success.toLocaleString("en-NG")}</strong> added to {goal.name}.</p>}
    <button className={styles.primaryAction} type="submit" disabled={!valid || saving} aria-busy={saving}>{saving ? "Contributing…" : "Contribute"}</button>
  </form>;
}
