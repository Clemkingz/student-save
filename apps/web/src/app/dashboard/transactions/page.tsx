"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { DashboardFrame } from "../_components/DashboardFrame";
import { MockReceipt } from "../_components/MockReceipt";
import { TransactionSuccessPopup } from "../_components/TransactionSuccessPopup";
import { getMockTransactions, localDateValue, type MockTransaction } from "../_components/mockFinance";
import { verifyTransactionPin } from "../_components/transactionPin";
import { useDashboardSession } from "../_components/useDashboardSession";
import styles from "../dashboard.module.css";

type TransactionType = "expense" | "income" | "withdrawal";
type Transaction = MockTransaction;
type MockBank = { name: string; code: string };

const mockBanks: MockBank[] = [
  { name: "Access Bank", code: "044" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "Guaranty Trust Bank", code: "058" },
  { name: "United Bank for Africa", code: "033" },
  { name: "Zenith Bank", code: "057" },
];
const expenseCategories = ["Food", "Transport", "Travelling", "Textbook", "Laptop", "Accommodation", "Utilities", "Healthcare", "Entertainment", "Other"];
const incomeCategories = ["Allowance", "Salary", "Scholarship", "Gift", "Freelance", "Other"];

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatAmount(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function TransactionContent() {
  const { email, ready } = useDashboardSession();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(expenseCategories[0] ?? "Other");
  const [date, setDate] = useState(localDateValue());
  const [note, setNote] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showRecipientDialog, setShowRecipientDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [successfulTransaction, setSuccessfulTransaction] = useState<Transaction | null>(null);
  const [successToast, setSuccessToast] = useState<{ id: string; message: string } | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const banks = mockBanks;
  const [recipientBankCode, setRecipientBankCode] = useState("");
  const [recipientAccountNumber, setRecipientAccountNumber] = useState("");
  const [accountResolved, setAccountResolved] = useState(false);
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [resolutionError, setResolutionError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [transactionPin, setTransactionPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const storageKey = `studentsave:transactions:${email}`;
  const categories = type === "expense" ? expenseCategories : type === "withdrawal" ? ["Withdrawal"] : incomeCategories;
  const balance = Math.max(0, transactions.reduce((sum, transaction) => sum + (transaction.type === "income" ? transaction.amount : -transaction.amount), 0));

  useEffect(() => {
    if (!ready || !email) return;
    const refreshTransactions = () => setTransactions(getMockTransactions(email));
    refreshTransactions();
    window.addEventListener("storage", refreshTransactions);
    return () => window.removeEventListener("storage", refreshTransactions);
  }, [email, ready, storageKey]);

  function changeType(nextType: TransactionType) {
    setType(nextType);
    setCategory(nextType === "expense" ? expenseCategories[0] ?? "Other" : nextType === "withdrawal" ? "Withdrawal" : incomeCategories[0] ?? "Other");
    setError("");
    setNotice("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category) {
      setError("Choose a transaction category.");
      setNotice("");
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      setNotice("");
      return;
    }

    if (type !== "income" && numericAmount > balance) {
      setError(`Your available tracked balance is ${formatAmount(balance)}. Lower the amount to continue.`);
      setNotice("");
      return;
    }

    if (type === "income") {
      const transaction: Transaction = {
        id: crypto.randomUUID(),
        amount: Math.round(numericAmount * 100) / 100,
        type: "income",
        category,
        date,
        note: note.trim() || "Manually recorded funds",
        receiptNumber: `SS-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        receiptCreatedAt: new Date().toISOString(),
      };
      const nextTransactions = [transaction, ...transactions];
      localStorage.setItem(storageKey, JSON.stringify(nextTransactions));
      setTransactions(nextTransactions);
      setAmount("");
      setNote("");
      setError("");
      setNotice("Funds added successfully.");
      setSuccessfulTransaction(transaction);
      setSuccessToast({ id: crypto.randomUUID(), message: "Funds added successfully!" });
      return;
    }

    setPaymentError("");
    setResolutionError("");
    setShowRecipientDialog(true);
  }

  function resolveRecipientAccount() {
    setResolutionError("");
    setAccountResolved(false);
    setRecipientName("");
    if (!recipientBankCode) {
      setResolutionError("Choose a bank first.");
      return;
    }
    if (!/^\d{10}$/.test(recipientAccountNumber)) {
      setResolutionError("Enter a 10-digit account number.");
      return;
    }
    setResolvingAccount(true);
    const knownMockNames: Record<string, string> = {
      "0123456789": "Ada Okafor",
      "1234567890": "Tunde Balogun",
      "0000000000": "StudentSave Test Recipient",
    };
    setRecipientName(knownMockNames[recipientAccountNumber] || `Mock Recipient ${recipientAccountNumber.slice(-4)}`);
    setAccountResolved(true);
    setResolvingAccount(false);
  }

  function continueToPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedAccountNumber = recipientAccountNumber.replace(/\s/g, "");
    if (!recipientName.trim() || !accountResolved) {
      setPaymentError("Find the mock recipient account name before continuing.");
      return;
    }
    if (!banks.some((bank) => bank.code === recipientBankCode)) {
      setPaymentError("Choose the recipient’s bank.");
      return;
    }
    if (!/^\d{10}$/.test(normalizedAccountNumber)) {
      setPaymentError("Enter a valid 10-digit account number.");
      return;
    }
    setPaymentError("");
    setShowRecipientDialog(false);
    setShowPinDialog(true);
  }

  async function confirmPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedAccountNumber = recipientAccountNumber.replace(/\s/g, "");
    if (!/^\d{4}$/.test(transactionPin)) {
      setPaymentError("Enter your 4-digit transaction PIN to continue.");
      return;
    }
    if (!(await verifyTransactionPin(email, transactionPin))) {
      setPaymentError("That transaction PIN is incorrect.");
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > balance) {
      setPaymentError(`This payment is above your available balance of ${formatAmount(balance)}. Check the amount and try again.`);
      return;
    }
    const selectedBank = banks.find((bank) => bank.code === recipientBankCode);
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      type: "expense",
      amount: Math.round(numericAmount * 100) / 100,
      category: type === "withdrawal" ? "Withdrawal" : category,
      date,
      note: note.trim() || (type === "withdrawal" ? "Cash withdrawal" : ""),
      recipientName: recipientName.trim(),
      recipientBank: selectedBank?.name || "",
      recipientAccountNumber: normalizedAccountNumber,
      receiptNumber: `SS-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      receiptCreatedAt: new Date().toISOString(),
    };
    const nextTransactions = [transaction, ...transactions];
    localStorage.setItem(storageKey, JSON.stringify(nextTransactions));
    setTransactions(nextTransactions);
    setAmount("");
    setNote("");
    setError("");
    setNotice(`${type === "withdrawal" ? "Withdrawal" : "Expense"} saved to mock storage.`);
    setRecipientName("");
    setRecipientBankCode("");
    setRecipientAccountNumber("");
    setAccountResolved(false);
    setResolutionError("");
    setTransactionPin("");
    setPaymentError("");
    setShowRecipientDialog(false);
    setShowPinDialog(false);
    setSuccessfulTransaction(transaction);
    setSuccessToast({ id: crypto.randomUUID(), message: type === "withdrawal" ? "Withdrawal successful!" : "Payment successful!" });
  }

  const recentTransactions = transactions.filter((transaction) => type === "income" ? transaction.type === "income" : type === "withdrawal" ? transaction.type === "expense" && transaction.category === "Withdrawal" : transaction.type === "expense" && transaction.category !== "Withdrawal").slice(0, 8);

  if (!ready) {
    return <main className={styles.mainContent} aria-live="polite">Loading transactions…</main>;
  }

  return (
    <DashboardFrame email={email} active="Transactions">
      <header className={styles.pageHeading}>
        <h1>Add transaction</h1>
        <p>Record an expense, a withdrawal, or funds received.</p>
      </header>

      <section className={styles.fundsSummary} aria-label="Available wallet balance">
        <div><span>Available tracked balance</span><strong>{formatAmount(balance)}</strong></div>
        <p>Expenses and withdrawals are limited to the funds you’ve recorded.</p>
      </section>

      <div className={styles.transactionTabs} role="group" aria-label="Transaction type">
        <button className={type === "expense" ? styles.transactionTabActive : styles.transactionTab} type="button" aria-pressed={type === "expense"} onClick={() => changeType("expense")}>Expense</button>
        <button className={type === "withdrawal" ? styles.transactionTabActive : styles.transactionTab} type="button" aria-pressed={type === "withdrawal"} onClick={() => changeType("withdrawal")}>Withdrawal</button>
        <button className={type === "income" ? styles.transactionTabActive : styles.transactionTab} type="button" aria-pressed={type === "income"} onClick={() => changeType("income")}>Funds added</button>
      </div>

      <div className={styles.transactionGrid}>
        <form className={`${styles.panel} ${styles.transactionForm}`} onSubmit={handleSubmit} noValidate>
          <h2>{type === "income" ? "Add funds" : type === "withdrawal" ? "Record withdrawal" : "New expense"}</h2>

          <div className={styles.transactionField}>
            <label htmlFor="amount">Amount</label>
            <div className={styles.transactionAmount}>
              <span aria-hidden="true">₦</span>
              <input id="amount" name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); setNotice(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? "amount-error" : undefined} />
            </div>
            {error && <span className={styles.transactionError} id="amount-error">{error}</span>}
          </div>

          <div className={styles.transactionField}>
            <label htmlFor="category">{type === "withdrawal" ? "Transaction type" : type === "income" ? "Source" : "Category"}</label>
            <select id="category" name="category" value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>

          <div className={styles.transactionField}>
            <label htmlFor="date">Date</label>
            <input id="date" name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </div>

          <div className={styles.transactionField}>
            <label htmlFor="note">Note (optional)</label>
            <input id="note" name="note" type="text" maxLength={120} placeholder="e.g. Lunch on campus" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>

          {notice && <p className={styles.transactionSaved} role="status">{notice}</p>}
          {type === "income" && <p className={styles.transactionFootnote}>Funds are added to your tracked balance immediately.</p>}
          <button className={styles.primaryAction} type="submit">{type === "income" ? "Add funds" : type === "withdrawal" ? "Send withdrawal to account" : "Pay / save expense"}</button>
        </form>

        <section className={styles.panel} aria-live="polite">
          <h2>Recent {type === "income" ? "funds added" : type === "withdrawal" ? "withdrawals" : "expenses"}</h2>
          {recentTransactions.length > 0 ? (
            <ul className={styles.recentTransactions}>
              {recentTransactions.map((transaction) => (
                <li className={styles.recentTransaction} key={transaction.id}>
                  <div><strong>{transaction.category}</strong><span>{formatDate(transaction.date)}{transaction.recipientName ? ` · To ${transaction.recipientName}` : ""}{transaction.note ? ` · ${transaction.note}` : ""}</span></div>
                  <b>{transaction.type === "expense" ? "−" : "+"}{formatAmount(transaction.amount)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyTransactions}>No {type === "income" ? "funds added" : type === "withdrawal" ? "withdrawals" : "expenses"} yet. Save one to see it here.</p>
          )}
          <p className={styles.transactionFootnote}>Transactions are saved in this browser for mock testing.</p>
        </section>
      </div>

      {showRecipientDialog && (
        <div className={styles.paymentOverlay}>
          <form className={styles.paymentDialog} onSubmit={continueToPin} noValidate role="dialog" aria-modal="true" aria-labelledby="paymentDialogTitle">
            <button className={styles.paymentClose} type="button" aria-label="Close payment details" onClick={() => { setShowRecipientDialog(false); setPaymentError(""); setTransactionPin(""); setRecipientName(""); setAccountResolved(false); }}>×</button>
            <span className={styles.fundsStep}>{type === "withdrawal" ? "CASH WITHDRAWAL" : "EXPENSE PAYMENT"}</span>
            <h2 id="paymentDialogTitle">{type === "withdrawal" ? "Where should we send it?" : "Recipient account details"}</h2>
            <p>{type === "withdrawal" ? "Enter where this withdrawal should be sent." : "Enter the account receiving this payment."}</p>
            <div className={styles.paymentAmount}><span>Amount</span><strong>{formatAmount(Number(amount) || 0)}</strong><small>{type === "withdrawal" ? "Cash withdrawal" : category}</small></div>
            <div className={styles.transactionField}><label htmlFor="recipientBank">Recipient bank</label><select id="recipientBank" value={recipientBankCode} onChange={(event) => { setRecipientBankCode(event.target.value); setRecipientName(""); setAccountResolved(false); setPaymentError(""); setResolutionError(""); }}><option value="">Select bank</option>{banks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}</select></div>
            <div className={styles.transactionField}><label htmlFor="recipientAccountNumber">Recipient account number</label><input id="recipientAccountNumber" inputMode="numeric" autoComplete="off" maxLength={10} value={recipientAccountNumber} onChange={(event) => { setRecipientAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10)); setRecipientName(""); setAccountResolved(false); setResolutionError(""); setPaymentError(""); }} placeholder="10-digit account number" /><button className={styles.mockResolveButton} type="button" onClick={resolveRecipientAccount} disabled={resolvingAccount || !recipientBankCode || recipientAccountNumber.length !== 10}>{resolvingAccount ? "Looking up mock account…" : accountResolved ? "Mock account ready" : "Find account name"}</button>{resolutionError && <span className={styles.transactionError} role="alert">{resolutionError}</span>}</div>
            <div className={styles.transactionField}><label htmlFor="recipientName">Recipient account name</label><input id="recipientName" autoComplete="off" readOnly value={recipientName} placeholder={accountResolved ? "Mock recipient name" : "Find the account name"} /><span className={styles.transactionFootnote}>Recipient details are simulated for testing.</span></div>
            {paymentError && <p className={styles.goalError} role="alert">{paymentError}</p>}
            <p className={styles.paymentMockNotice}>This prototype uses mock recipient details and records the payment locally. It does not transfer real money.</p>
            <button className={styles.primaryAction} type="submit">Continue to transaction PIN</button>
          </form>
        </div>
      )}

      {showPinDialog && (
        <div className={styles.paymentOverlay}>
          <form className={styles.paymentDialog} onSubmit={confirmPayment} noValidate role="dialog" aria-modal="true" aria-labelledby="transactionPinTitle">
            <button className={styles.paymentClose} type="button" aria-label="Back to recipient details" onClick={() => { setShowPinDialog(false); setShowRecipientDialog(true); setPaymentError(""); setTransactionPin(""); }}>×</button>
            <span className={styles.fundsStep}>FINAL STEP · TRANSACTION SECURITY</span>
            <h2 id="transactionPinTitle">Enter your transaction PIN</h2>
            <p>Confirm this {type === "withdrawal" ? "withdrawal" : "payment"} using your personal 4-digit PIN.</p>
            <div className={styles.paymentAmount}><span>Amount</span><strong>{formatAmount(Number(amount) || 0)}</strong><small>{type === "withdrawal" ? "Withdrawal" : category}</small></div>
            <div className={styles.recipientReview}>
              <span>Sending to</span>
              <strong>{recipientName}</strong>
              <small>{banks.find((bank) => bank.code === recipientBankCode)?.name} · {recipientAccountNumber}</small>
            </div>
            <div className={styles.transactionField}><label htmlFor="transactionPin">Transaction PIN</label><div className={styles.secretInputWrap}><input id="transactionPin" type={showPin ? "text" : "password"} inputMode="numeric" autoComplete="off" maxLength={4} autoFocus value={transactionPin} onChange={(event) => { setTransactionPin(event.target.value.replace(/\D/g, "").slice(0, 4)); setPaymentError(""); }} placeholder="Enter your 4-digit PIN" /><button type="button" className={styles.secretToggle} aria-label={showPin ? "Hide PIN" : "Show PIN"} onClick={() => setShowPin((visible) => !visible)}>{showPin ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><span className={styles.transactionFootnote}>Use the personal PIN you created when setting up your wallet.</span></div>
            {paymentError && <p className={styles.goalError} role="alert">{paymentError}</p>}
            <button className={styles.primaryAction} type="submit">Confirm {type === "withdrawal" ? "withdrawal" : "payment"}</button>
          </form>
        </div>
      )}
      {successfulTransaction && <MockReceipt transaction={successfulTransaction} onClose={() => setSuccessfulTransaction(null)} />}
      {successToast && <TransactionSuccessPopup key={successToast.id} message={successToast.message} />}
    </DashboardFrame>
  );
}

export default function TransactionsPage() {
  return <Suspense fallback={null}><TransactionContent /></Suspense>;
}
