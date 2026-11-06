"use client";

import { isSuccessfulCredit } from "../_components/mockFinance";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@repo/supabase/browser";
import { Eye, EyeOff } from "lucide-react";
import { DashboardFrame } from "../_components/DashboardFrame";
import { MockReceipt } from "../_components/MockReceipt";
import { GoalDialog } from "../_components/GoalDialog";
import { TransactionSuccessPopup } from "../_components/TransactionSuccessPopup";
import { localDateValue, type MockTransaction } from "../_components/mockFinance";
import { rpcMessage, toKobo, useLedger, useRefreshFinance, type RpcResult } from "../../../lib/queries/ledger";
import { useDashboardSession } from "../_components/useDashboardSession";
import { OTHER, OtherDetailField, resolveOther } from "../_components/OtherDetailField";
import styles from "../dashboard.module.css";
import { PageLoader } from "../../PageLoader";

type TransactionType = "expense" | "income" | "withdrawal";
type Bank = { name: string; code: string };

const expenseCategories = ["Food", "Transport", "Travelling", "Textbook", "Laptop", "Accommodation", "Utilities", "Healthcare", "Entertainment", "Data", "Other"];
const incomeCategories = ["Allowance", "Salary", "Scholarship", "Gift", "Freelance", "Other"];

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatAmount(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function TransactionContent() {
  const { userId, email, ready } = useDashboardSession();
  const { data: ledger, refetch } = useLedger(ready ? userId : "");
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(expenseCategories[0] ?? OTHER);
  const [categoryDetail, setCategoryDetail] = useState("");
  const [date, setDate] = useState(localDateValue());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showRecipientDialog, setShowRecipientDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [receiptId, setReceiptId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const attemptKey = useRef("");
  const refreshFinance = useRefreshFinance();
  const [editing, setEditing] = useState<{ transaction: MockTransaction; mode: "edit" | "delete" } | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editCategoryDetail, setEditCategoryDetail] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editError, setEditError] = useState("");
  const [successToast, setSuccessToast] = useState<{ id: string; message: string } | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [recipientBankCode, setRecipientBankCode] = useState("");
  const [recipientAccountNumber, setRecipientAccountNumber] = useState("");
  const [accountResolved, setAccountResolved] = useState(false);
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [resolutionError, setResolutionError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [transactionPin, setTransactionPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const chosenCategory = resolveOther(category, categoryDetail);
  const categories = type === "expense" ? expenseCategories : type === "withdrawal" ? ["Withdrawal"] : incomeCategories;
  const transactions = ledger?.transactions ?? [];
  const balance = ledger?.balance ?? 0;
  const successfulTransaction = transactions.find((transaction) => transaction.id === receiptId) ?? null;

  useEffect(() => {
    if (!ready) return;
    void createClient().rpc("sim_list_banks").then(({ data }) => setBanks((data as { banks?: Bank[] } | null)?.banks ?? []));
  }, [ready]);

  function openEditor(transaction: MockTransaction, mode: "edit" | "delete") {
    setEditing({ transaction, mode });
    setEditAmount(String(transaction.amount));
    const editOptions = transaction.kind === "income" ? incomeCategories : expenseCategories;
    const listed = editOptions.includes(transaction.category) || transaction.category === "Withdrawal";
    setEditCategory(listed ? transaction.category : OTHER);
    setEditCategoryDetail(listed ? "" : transaction.category);
    setEditDate(transaction.date);
    setEditNote(transaction.note);
    setEditPin("");
    setEditError("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    if (editing.mode === "edit" && !resolveOther(editCategory, editCategoryDetail)) { setEditError("Describe the category."); return; }
    setSubmitting(true);
    const supabase = createClient();
    const { data, error: rpcError } = editing.mode === "delete"
      ? await supabase.rpc("delete_transaction", { p_id: editing.transaction.id, p_pin: editPin })
      : await supabase.rpc("update_transaction", { p_id: editing.transaction.id, p_amount: toKobo(Number(editAmount)), p_category: resolveOther(editCategory, editCategoryDetail), p_occurred_on: editDate, p_note: editNote.trim(), p_pin: editPin });
    setSubmitting(false);
    const result = data as RpcResult | null;
    if (rpcError || !result?.ok) {
      setEditError(rpcMessage(result, "This record could not be changed. Try again."));
      return;
    }
    await refreshFinance();
    setNotice(editing.mode === "delete" ? "Transaction deleted." : "Transaction updated.");
    setEditing(null);
  }

  function changeType(nextType: TransactionType) {
    setType(nextType);
    setCategory(nextType === "expense" ? expenseCategories[0] ?? OTHER : nextType === "withdrawal" ? "Withdrawal" : incomeCategories[0] ?? OTHER);
    setCategoryDetail("");
    setError("");
    setNotice("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosenCategory) {
      setError(category === OTHER ? "Describe what this transaction is for." : "Choose a transaction category.");
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
      setSubmitting(true);
      attemptKey.current ||= crypto.randomUUID();
      const { data, error: rpcError } = await createClient().rpc("record_income", {
        p_amount: toKobo(numericAmount),
        p_category: chosenCategory,
        p_occurred_on: date,
        p_note: note.trim(),
        p_idempotency_key: attemptKey.current,
      });
      setSubmitting(false);
      const result = data as RpcResult | null;
      if (rpcError || !result?.ok) {
        setError(rpcMessage(result, "Funds could not be saved. Try again."));
        return;
      }
      attemptKey.current = "";
      await refetch();
      setAmount("");
      setNote("");
      setError("");
      setNotice("Test credit added.");
      setReceiptId(String(result.transaction_id));
      setSuccessToast({ id: crypto.randomUUID(), message: "Funds added successfully!" });
      return;
    }

    setPaymentError("");
    setResolutionError("");
    setShowRecipientDialog(true);
  }

  async function resolveRecipientAccount() {
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
    const { data, error: rpcError } = await createClient().rpc("resolve_recipient", { p_bank_code: recipientBankCode, p_account_number: recipientAccountNumber });
    setResolvingAccount(false);
    const result = data as (RpcResult & { name?: string }) | null;
    if (rpcError || !result?.ok || !result.name) {
      setResolutionError(rpcMessage(result, "We couldn’t look up this account. Try again."));
      return;
    }
    setRecipientName(result.name);
    setAccountResolved(true);
  }

  function continueToPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedAccountNumber = recipientAccountNumber.replace(/\s/g, "");
    if (!recipientName.trim() || !accountResolved) {
      setPaymentError("Find the recipient account name before continuing.");
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
    setSubmitting(true);
    attemptKey.current ||= crypto.randomUUID();
    const { data, error: rpcError } = await createClient().rpc("start_transfer", {
      p_kind: type,
      p_amount: toKobo(Number(amount)),
      p_category: type === "withdrawal" ? "Withdrawal" : chosenCategory,
      p_occurred_on: date,
      p_note: note.trim(),
      p_bank_code: recipientBankCode,
      p_account_number: normalizedAccountNumber,
      p_pin: transactionPin,
      p_idempotency_key: attemptKey.current,
    });
    setSubmitting(false);
    const result = data as RpcResult | null;
    if (rpcError || !result?.ok) {
      if (result?.code !== "pin_incorrect") attemptKey.current = "";
      setPaymentError(rpcMessage(result, "Payment could not be started. Try again."));
      return;
    }
    attemptKey.current = "";
    await refetch();
    setAmount("");
    setNote("");
    setError("");
    setNotice(`${type === "withdrawal" ? "Withdrawal" : "Payment"} sent to the simulated bank.`);
    setRecipientName("");
    setRecipientBankCode("");
    setRecipientAccountNumber("");
    setAccountResolved(false);
    setResolutionError("");
    setTransactionPin("");
    setPaymentError("");
    setShowRecipientDialog(false);
    setShowPinDialog(false);
    setReceiptId(String(result.transaction_id));
    setSuccessToast({ id: crypto.randomUUID(), message: type === "withdrawal" ? "Withdrawal started" : "Payment started" });
  }

  const recentTransactions = transactions.filter((transaction) => type === "income" ? transaction.type === "income" : type === "withdrawal" ? transaction.type === "expense" && transaction.category === "Withdrawal" : transaction.type === "expense" && transaction.category !== "Withdrawal").slice(0, 8);

  if (!ready || !ledger) {
    return <PageLoader message="Loading transactions…" />;
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
          {category === OTHER && <OtherDetailField id="categoryDetail" label={type === "income" ? "Describe the source" : "Describe the expense"} placeholder={type === "income" ? "e.g. Sold old textbooks" : "e.g. Hostel repairs"} value={categoryDetail} onChange={(value) => { setCategoryDetail(value); setError(""); }} />}

          <div className={styles.transactionField}>
            <label htmlFor="date">Date</label>
            <input id="date" name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </div>

          <div className={styles.transactionField}>
            <label htmlFor="note">Note (optional)</label>
            <input id="note" name="note" type="text" maxLength={120} placeholder="e.g. Lunch on campus" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>

          {notice && <p className={styles.transactionSaved} role="status">{notice}</p>}
          {type === "income" && <p className={styles.transactionFootnote}>This is a test credit. It is added to your balance immediately.</p>}
          <button className={styles.primaryAction} type="submit" disabled={submitting} aria-busy={submitting}>{type === "income" ? "Add funds" : type === "withdrawal" ? "Send withdrawal to account" : "Pay / save expense"}</button>
        </form>

        <section className={styles.panel} aria-live="polite">
          <h2>Recent {type === "income" ? "funds added" : type === "withdrawal" ? "withdrawals" : "expenses"}</h2>
          {recentTransactions.length > 0 ? (
            <ul className={styles.recentTransactions}>
              {recentTransactions.map((transaction) => (
                <li className={styles.recentTransaction} key={transaction.id}>
                  <div><strong>{transaction.category}</strong><span>{formatDate(transaction.date)}{transaction.recipientName ? ` · To ${transaction.recipientName}` : ""}{transaction.note ? ` · ${transaction.note}` : ""}{transaction.status === "pending" ? " · Pending" : transaction.status === "failed" ? " · Failed" : ""}</span></div>
                  <b className={isSuccessfulCredit(transaction) ? "funds-added-amount" : undefined}>{transaction.type === "expense" ? "−" : "+"}{formatAmount(transaction.amount)}</b>
                  {transaction.status === "completed" && ["income", "expense"].includes(transaction.kind) && <span className={styles.goalCardActions}><button className={styles.settingsTextButton} type="button" onClick={() => openEditor(transaction, "edit")}>Edit</button><button className={styles.settingsTextButton} type="button" onClick={() => openEditor(transaction, "delete")}>Delete</button></span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyTransactions}>No {type === "income" ? "funds added" : type === "withdrawal" ? "withdrawals" : "expenses"} yet. Save one to see it here.</p>
          )}
          <p className={styles.transactionFootnote}>Test mode: all money and banks here are simulated.</p>
        </section>
      </div>

      {showRecipientDialog && (
        <div className={styles.paymentOverlay}>
          <form className={styles.paymentDialog} onSubmit={continueToPin} noValidate role="dialog" aria-modal="true" aria-labelledby="paymentDialogTitle">
            <button className={styles.paymentClose} type="button" aria-label="Close payment details" onClick={() => { setShowRecipientDialog(false); setPaymentError(""); setTransactionPin(""); setRecipientName(""); setAccountResolved(false); }}>×</button>
            <span className={styles.fundsStep}>{type === "withdrawal" ? "CASH WITHDRAWAL" : "EXPENSE PAYMENT"}</span>
            <h2 id="paymentDialogTitle">{type === "withdrawal" ? "Where should we send it?" : "Recipient account details"}</h2>
            <p>{type === "withdrawal" ? "Enter where this withdrawal should be sent." : "Enter the account receiving this payment."}</p>
            <div className={styles.paymentAmount}><span>Amount</span><strong>{formatAmount(Number(amount) || 0)}</strong><small>{type === "withdrawal" ? "Cash withdrawal" : chosenCategory}</small></div>
            <div className={styles.transactionField}><label htmlFor="recipientBank">Recipient bank</label><select id="recipientBank" value={recipientBankCode} onChange={(event) => { setRecipientBankCode(event.target.value); setRecipientName(""); setAccountResolved(false); setPaymentError(""); setResolutionError(""); }}><option value="">Select bank</option>{banks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}</select></div>
            <div className={styles.transactionField}><label htmlFor="recipientAccountNumber">Recipient account number</label><input id="recipientAccountNumber" inputMode="numeric" autoComplete="off" maxLength={10} value={recipientAccountNumber} onChange={(event) => { setRecipientAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10)); setRecipientName(""); setAccountResolved(false); setResolutionError(""); setPaymentError(""); }} placeholder="10-digit account number" /><button className={styles.mockResolveButton} type="button" onClick={resolveRecipientAccount} disabled={resolvingAccount || !recipientBankCode || recipientAccountNumber.length !== 10} aria-busy={resolvingAccount}>{resolvingAccount ? "Looking up account…" : accountResolved ? "Account found" : "Find account name"}</button>{resolutionError && <span className={styles.transactionError} role="alert">{resolutionError}</span>}</div>
            <div className={styles.transactionField}><label htmlFor="recipientName">Recipient account name</label><input id="recipientName" autoComplete="off" readOnly value={recipientName} placeholder="Find the account name" /><span className={styles.transactionFootnote}>Recipient details are simulated for testing.</span></div>
            {paymentError && <p className={styles.goalError} role="alert">{paymentError}</p>}
            <p className={styles.paymentMockNotice}>Test mode: this goes through a simulated bank. No real money moves.</p>
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
            <div className={styles.paymentAmount}><span>Amount</span><strong>{formatAmount(Number(amount) || 0)}</strong><small>{type === "withdrawal" ? "Withdrawal" : chosenCategory}</small></div>
            <div className={styles.recipientReview}>
              <span>Sending to</span>
              <strong>{recipientName}</strong>
              <small>{banks.find((bank) => bank.code === recipientBankCode)?.name} · {recipientAccountNumber}</small>
            </div>
            <div className={styles.transactionField}><label htmlFor="transactionPin">Transaction PIN</label><div className={styles.secretInputWrap}><input id="transactionPin" type={showPin ? "text" : "password"} inputMode="numeric" autoComplete="off" maxLength={4} autoFocus value={transactionPin} onChange={(event) => { setTransactionPin(event.target.value.replace(/\D/g, "").slice(0, 4)); setPaymentError(""); }} placeholder="Enter your 4-digit PIN" /><button type="button" className={styles.secretToggle} aria-label={showPin ? "Hide PIN" : "Show PIN"} onClick={() => setShowPin((visible) => !visible)}>{showPin ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><span className={styles.transactionFootnote}>Use the personal PIN you created when setting up your wallet.</span></div>
            {paymentError && <p className={styles.goalError} role="alert">{paymentError}</p>}
            <button className={styles.primaryAction} type="submit" disabled={submitting} aria-busy={submitting}>Confirm {type === "withdrawal" ? "withdrawal" : "payment"}</button>
          </form>
        </div>
      )}
      {editing && <GoalDialog title={editing.mode === "delete" ? "Delete this transaction?" : "Edit transaction"} onClose={() => setEditing(null)}>
        <form className={styles.goalForm} onSubmit={saveEdit} noValidate>
          {editing.mode === "delete" ? <p>{editing.transaction.category} · {formatAmount(editing.transaction.amount)}. Your balance, budgets, and reports will update.</p> : <>
            <div className={styles.transactionField}><label htmlFor="editAmount">Amount (₦)</label><input id="editAmount" type="number" inputMode="decimal" min="0.01" step="0.01" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} /></div>
            <div className={styles.transactionField}><label htmlFor="editCategory">Category</label><select id="editCategory" value={editCategory} onChange={(event) => setEditCategory(event.target.value)}>{(editing.transaction.kind === "income" ? incomeCategories : expenseCategories).map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
            {editCategory === OTHER && <OtherDetailField id="editCategoryDetail" label="Describe the category" value={editCategoryDetail} onChange={setEditCategoryDetail} />}
            <div className={styles.transactionField}><label htmlFor="editDate">Date</label><input id="editDate" type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} /></div>
            <div className={styles.transactionField}><label htmlFor="editNote">Note</label><input id="editNote" type="text" maxLength={120} value={editNote} onChange={(event) => setEditNote(event.target.value)} /></div>
          </>}
          <div className={styles.transactionField}><label htmlFor="editPin">Transaction PIN</label><input id="editPin" type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={editPin} onChange={(event) => setEditPin(event.target.value.replace(/\D/g, "").slice(0, 4))} /></div>
          {editError && <p className={styles.goalError} role="alert">{editError}</p>}
          <button className={styles.primaryAction} type="submit" disabled={submitting} aria-busy={submitting}>{editing.mode === "delete" ? "Delete transaction" : "Save changes"}</button>
        </form>
      </GoalDialog>}
      {successfulTransaction && <MockReceipt transaction={successfulTransaction} onClose={() => setReceiptId("")} />}
      {successToast && <TransactionSuccessPopup key={successToast.id} message={successToast.message}>{successfulTransaction && isSuccessfulCredit(successfulTransaction) && <strong className="funds-added-amount">+{formatAmount(successfulTransaction.amount)}</strong>}</TransactionSuccessPopup>}
    </DashboardFrame>
  );
}

export default function TransactionsPage() {
  return <Suspense fallback={null}><TransactionContent /></Suspense>;
}
