"use client";

import { Suspense, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@repo/supabase/browser";
import { rpcMessage, toKobo, useLedger, type RpcResult } from "../../../lib/queries/ledger";
import { DashboardFrame } from "../_components/DashboardFrame";
import { MockReceipt } from "../_components/MockReceipt";
import { TransactionSuccessPopup } from "../_components/TransactionSuccessPopup";
import { useDashboardSession } from "../_components/useDashboardSession";
import styles from "../dashboard.module.css";
import { OTHER, OtherDetailField, resolveOther } from "../_components/OtherDetailField";
import { PageLoader } from "../../PageLoader";

const fundSources = ["Allowance", "Scholarship", "Gift", "Salary", "Freelance", "Other"];

function money(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function AddFundsContent() {
  const { userId, email, wallet, ready } = useDashboardSession();
  const { data: ledger, refetch } = useLedger(ready ? userId : "");
  const attemptKey = useRef("");
  const transferKey = useRef("");
  const busy = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState(fundSources[0] ?? OTHER);
  const [sourceDetail, setSourceDetail] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [sender, setSender] = useState("");
  const [transferError, setTransferError] = useState("");
  const [transferNotice, setTransferNotice] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [successToast, setSuccessToast] = useState<{ id: string; message: string } | null>(null);

  const transactions = ledger?.transactions ?? [];
  const balance = ledger?.balance ?? 0;
  const successfulTransaction = transactions.find((item) => item.id === receiptId) ?? null;
  const sources = transactions.length === 0 ? [...fundSources, "Opening balance"] : fundSources;

  async function recordFunds(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      setNotice("");
      return;
    }
    const chosenSource = resolveOther(source, sourceDetail);
    if (!chosenSource) {
      setError("Describe where the money came from.");
      setNotice("");
      return;
    }
    busy.current = true; setSubmitting(true);
    attemptKey.current ||= crypto.randomUUID();
    const supabase = createClient();
    const { data, error: rpcError } = source === "Opening balance"
      ? await supabase.rpc("set_opening_balance", { p_amount: toKobo(numericAmount), p_idempotency_key: attemptKey.current })
      : await supabase.rpc("record_income", { p_amount: toKobo(numericAmount), p_category: chosenSource, p_occurred_on: ledger?.today ?? "", p_note: note.trim(), p_idempotency_key: attemptKey.current });
    busy.current = false;
    setSubmitting(false);
    const result = data as RpcResult | null;
    if (rpcError || !result?.ok) {
      setError(rpcMessage(result, "Funds could not be saved. Try again."));
      return;
    }
    attemptKey.current = "";
    await refetch();
    setSource(fundSources[0] ?? OTHER);
    setSourceDetail("");
    setAmount("");
    setNote("");
    setError("");
    setNotice("Funds added successfully.");
    setReceiptId(String(result.transaction_id));
    setSuccessToast({ id: crypto.randomUUID(), message: "Funds added successfully!" });
  }

  async function simulateTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(transferAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setTransferError("Enter an amount greater than zero.");
      return;
    }
    if (transferring) return;
    setTransferring(true);
    transferKey.current ||= crypto.randomUUID();
    const { data, error: rpcError } = await createClient().rpc("sim_incoming_transfer", { p_amount: toKobo(numericAmount), p_sender: sender.trim(), p_idempotency_key: transferKey.current });
    setTransferring(false);
    const result = data as RpcResult | null;
    if (rpcError || !result?.ok) {
      setTransferError(rpcMessage(result, "The simulated transfer could not start. Try again."));
      return;
    }
    transferKey.current = "";
    setTransferAmount("");
    setSender("");
    setTransferError("");
    setTransferNotice("Simulated transfer started. Your balance updates in a few seconds.");
    window.setTimeout(() => void refetch(), 3500);
    window.setTimeout(() => void refetch(), 6000);
  }

  if (!ready || !wallet || !ledger) {
    return <PageLoader message="Loading your account details…" />;
  }

  return (
    <DashboardFrame email={email} active="Add funds">
      <header className={styles.pageHeading}>
        <h1>Add funds</h1>
        <p>Add simulated money to your test wallet.</p>
      </header>

      <section className={styles.fundsSummary} aria-label="Wallet balance">
        <div><span>Available tracked balance</span><strong>{money(balance)}</strong></div>
        <p>Test mode: this is simulated money, not a bank balance.</p>
      </section>

      <div className={styles.fundsContentGrid}>
        <form className={`${styles.panel} ${styles.fundsForm}`} onSubmit={recordFunds} noValidate>
          <div>
            <span className={styles.fundsStep}>MANUAL ENTRY</span>
            <h2>Record funds added</h2>
            <p>Record money manually. It will appear in your balance right away.</p>
          </div>
          <div className={styles.transactionField}>
            <label htmlFor="fundAmount">Amount</label>
            <div className={styles.transactionAmount}><span aria-hidden="true">₦</span><input id="fundAmount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); setNotice(""); }} aria-invalid={Boolean(error)} /></div>
          </div>
          <div className={styles.transactionField}>
            <label htmlFor="fundSource">Where did the money come from?</label>
            <select id="fundSource" value={source} onChange={(event) => { setSource(event.target.value); setError(""); }}>{sources.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          {source === OTHER && <OtherDetailField id="fundSourceDetail" label="Describe the source" placeholder="e.g. Sold old textbooks" value={sourceDetail} onChange={(value) => { setSourceDetail(value); setError(""); }} />}
          <div className={styles.transactionField}>
            <label htmlFor="fundNote">Note (optional)</label>
            <input id="fundNote" type="text" maxLength={120} placeholder="e.g. October allowance" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          {error && <p className={styles.goalError} role="alert">{error}</p>}
          {notice && <p className={styles.transactionSaved} role="status">{notice}</p>}
          <button className={styles.primaryAction} type="submit" disabled={submitting || !Number.isFinite(Number(amount)) || Number(amount) < .01} aria-busy={submitting}>{submitting ? "Adding funds…" : "Add funds manually"}</button>
          <p className={styles.transactionFootnote}>No real money moves.</p>
        </form>

        <form className={styles.fundsPanel} onSubmit={simulateTransfer} noValidate aria-labelledby="bank-transfer-title">
          <span className={styles.fundsStep}>SIMULATED BANK</span>
          <h2 id="bank-transfer-title">Simulated incoming transfer</h2>
          <p>Pretend someone sent money to your test wallet. It stays pending for a moment, then settles.</p>
          <div className={styles.fundsAccount}><span>Test wallet reference · {wallet.currency || "NGN"}</span><strong>{wallet.accountNumber}</strong></div>
          <div className={styles.transactionField}>
            <label htmlFor="transferAmount">Amount</label>
            <div className={styles.transactionAmount}><span aria-hidden="true">₦</span><input id="transferAmount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={transferAmount} onChange={(event) => { setTransferAmount(event.target.value); setTransferError(""); setTransferNotice(""); }} /></div>
          </div>
          <div className={styles.transactionField}>
            <label htmlFor="transferSender">Sender name (optional)</label>
            <input id="transferSender" type="text" maxLength={60} placeholder="e.g. Test Sender" value={sender} onChange={(event) => setSender(event.target.value)} />
          </div>
          {transferError && <p className={styles.goalError} role="alert">{transferError}</p>}
          {transferNotice && <p className={styles.transactionSaved} role="status">{transferNotice}</p>}
          <button className={styles.primaryAction} type="submit" disabled={transferring} aria-busy={transferring}>Simulate transfer</button>
          <p className={styles.transactionFootnote}>Do not send real money. This wallet cannot receive it.</p>
          <Link className={styles.backLink} href="/dashboard">← Back to dashboard</Link>
        </form>
      </div>

      {successfulTransaction && <MockReceipt transaction={successfulTransaction} onClose={() => setReceiptId("")} />}
      {successToast && <TransactionSuccessPopup key={successToast.id} message={successToast.message}>{successfulTransaction && <strong className="funds-added-amount">+{money(successfulTransaction.amount)}</strong>}</TransactionSuccessPopup>}
    </DashboardFrame>
  );
}

export default function AddFundsPage() {
  return <Suspense fallback={null}><AddFundsContent /></Suspense>;
}
