"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { DashboardFrame } from "../_components/DashboardFrame";
import { getMockTransactions, localDateValue, type MockTransaction } from "../_components/mockFinance";
import { MockReceipt } from "../_components/MockReceipt";
import { TransactionSuccessPopup } from "../_components/TransactionSuccessPopup";
import { useDashboardSession } from "../_components/useDashboardSession";
import styles from "../dashboard.module.css";

const fundSources = ["Allowance", "Scholarship", "Gift", "Salary", "Freelance", "Other"];

function money(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function AddFundsContent() {
  const { email, wallet, ready } = useDashboardSession();
  const [transactions, setTransactions] = useState<MockTransaction[]>([]);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState(fundSources[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [showBankTransferDetails, setShowBankTransferDetails] = useState(false);
  const [successfulTransaction, setSuccessfulTransaction] = useState<MockTransaction | null>(null);
  const [successToast, setSuccessToast] = useState<{ id: string; message: string } | null>(null);

  const refreshFunds = useCallback(() => {
    if (!ready || !email) return;
    setTransactions(getMockTransactions(email));
  }, [email, ready]);

  useEffect(() => {
    refreshFunds();
    window.addEventListener("storage", refreshFunds);
    return () => window.removeEventListener("storage", refreshFunds);
  }, [refreshFunds]);

  const balance = Math.max(0, transactions.reduce((sum, item) => sum + (item.type === "income" ? item.amount : -item.amount), 0));

  function recordFunds(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      setNotice("");
      return;
    }
    const transaction: MockTransaction = {
      id: crypto.randomUUID(),
      amount: Math.round(numericAmount * 100) / 100,
      type: "income",
      category: source,
      date: localDateValue(),
      note: note.trim() || "Manually recorded funds",
      receiptNumber: `SS-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      receiptCreatedAt: new Date().toISOString(),
    };
    const nextTransactions = [transaction, ...transactions];
    localStorage.setItem(`studentsave:transactions:${email}`, JSON.stringify(nextTransactions));
    setTransactions(nextTransactions);
    setAmount("");
    setNote("");
    setError("");
    setNotice("Funds added successfully.");
    setSuccessfulTransaction(transaction);
    setSuccessToast({ id: crypto.randomUUID(), message: "Funds added successfully!" });
  }

  async function copyAccountNumber() {
    try {
      await navigator.clipboard.writeText(wallet.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  if (!ready || !wallet) {
    return <main className={styles.mainContent} aria-live="polite">Loading your account details…</main>;
  }

  return (
    <DashboardFrame email={email} active="Add funds">
      <header className={styles.pageHeading}>
        <h1>Add funds</h1>
        <p>Record money you’ve added to your Sabi Save account.</p>
      </header>

      <section className={styles.fundsSummary} aria-label="Wallet balance">
        <div><span>Available tracked balance</span><strong>{money(balance)}</strong></div>
        <p>This is your StudentSave record, not a bank balance.</p>
      </section>

      <div className={styles.fundsContentGrid}>
        <form className={`${styles.panel} ${styles.fundsForm}`} onSubmit={recordFunds} noValidate>
          <div>
            <span className={styles.fundsStep}>MANUAL ENTRY</span>
            <h2>Record funds added</h2>
            <p>Record money added to your account manually. It will appear in your tracked balance right away.</p>
          </div>
          <div className={styles.transactionField}>
            <label htmlFor="fundAmount">Amount</label>
            <div className={styles.transactionAmount}><span aria-hidden="true">₦</span><input id="fundAmount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); setNotice(""); }} aria-invalid={Boolean(error)} /></div>
          </div>
          <div className={styles.transactionField}>
            <label htmlFor="fundSource">Where did the money come from?</label>
            <select id="fundSource" value={source} onChange={(event) => { setSource(event.target.value); setError(""); }}>{fundSources.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          <div className={styles.transactionField}>
            <label htmlFor="fundNote">Note (optional)</label>
            <input id="fundNote" type="text" maxLength={120} placeholder="e.g. October allowance" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          {error && <p className={styles.goalError} role="alert">{error}</p>}
          {notice && <p className={styles.transactionSaved} role="status">{notice}</p>}
          <button className={styles.primaryAction} type="submit">Add funds manually</button>
          <p className={styles.transactionFootnote}>This is a mock record for testing. It does not move real money.</p>
        </form>

        <section className={styles.fundsPanel} aria-labelledby="bank-transfer-title">
          <span className={styles.fundsStep}>ADD FUNDS</span>
          <h2 id="bank-transfer-title">Bank transfer</h2>
          <p>View your Sabi Save account details to use when setting up a transfer in your bank app.</p>
          <button className={styles.bankTransferLauncher} type="button" onClick={() => setShowBankTransferDetails(true)}>
            <span className={styles.bankTransferIcon} aria-hidden="true">₦</span>
            <span><strong>View bank transfer details</strong><small>Show account number and account name</small></span>
            <span className={styles.bankTransferArrow} aria-hidden="true">→</span>
          </button>
          <p className={styles.transactionFootnote}>Bank transfer setup is shown for this prototype. Transfer funds are not confirmed automatically.</p>
          <Link className={styles.backLink} href={`/dashboard?email=${encodeURIComponent(email)}`}>← Back to dashboard</Link>
        </section>
      </div>

      {showBankTransferDetails && <div className={styles.paymentOverlay} onClick={(event) => { if (event.target === event.currentTarget) setShowBankTransferDetails(false); }}>
        <section className={styles.paymentDialog} role="dialog" aria-modal="true" aria-labelledby="bankTransferDialogTitle">
          <button className={styles.paymentClose} type="button" aria-label="Close bank transfer details" onClick={() => setShowBankTransferDetails(false)}>×</button>
          <span className={styles.fundsStep}>SABI SAVE ACCOUNT</span>
          <h2 id="bankTransferDialogTitle">Bank transfer details</h2>
          <p>Use these details as the destination account in your bank app.</p>
          <div className={styles.fundsAccount}><span>Account number · {wallet.currency || "NGN"}</span><strong>{wallet.accountNumber}</strong></div>
          <button className={styles.copyAccountButton} type="button" onClick={copyAccountNumber}>{copied ? "Copied" : "Copy account number"}</button>
          <div className={styles.fundsAccountName}><span>Account name</span><strong>{wallet.ownerName || email}</strong></div>
          <p className={styles.paymentMockNotice}>Transfers are not automatically verified in this prototype. Add received funds using the manual entry form.</p>
        </section>
      </div>}

      {successfulTransaction && <MockReceipt transaction={successfulTransaction} onClose={() => setSuccessfulTransaction(null)} />}
      {successToast && <TransactionSuccessPopup key={successToast.id} message={successToast.message} />}
    </DashboardFrame>
  );
}

export default function AddFundsPage() {
  return <Suspense fallback={null}><AddFundsContent /></Suspense>;
}
