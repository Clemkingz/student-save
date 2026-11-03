"use client";

import { isSuccessfulCredit } from "./mockFinance";

import Image from "next/image";
import { useState } from "react";
import { TransactionSuccessPopup } from "./TransactionSuccessPopup";
import type { MockTransaction } from "./mockFinance";
import styles from "./mockReceipt.module.css";

export function MockReceipt({ transaction, onClose }: { transaction: MockTransaction; onClose: () => void }) {
  const [toast, setToast] = useState<{ id: number; message: string; tone: "success" | "error" } | null>(null);
  const isWithdrawal = transaction.category === "Withdrawal";
  const isIncome = transaction.type === "income";
  const date = transaction.receiptCreatedAt || `${transaction.date}T12:00:00`;
  const account = transaction.recipientAccountNumber || "—";
  const label = isIncome ? "Funds added" : isWithdrawal ? "Withdrawal" : "Payment";
  const statusText = transaction.status === "pending" ? `${label} pending` : transaction.status === "failed" ? `${label} failed. Funds were returned` : `${label} successful`;
  const shareReceipt = async () => {
    const summary = `StudentSave receipt ${transaction.receiptNumber || transaction.id}\n${isIncome ? "Funds added" : isWithdrawal ? "Withdrawal" : transaction.category}: ${isIncome ? "+" : "−"}₦${transaction.amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nDate: ${new Date(date).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`;
    if (navigator.share) {
      try { await navigator.share({ title: "StudentSave receipt", text: summary }); return; } catch { /* The user may cancel sharing. */ }
    }
    try {
      await navigator.clipboard.writeText(summary);
      setToast({ id: Date.now(), message: "Receipt details copied. You can paste and share them.", tone: "success" });
    } catch {
      setToast({ id: Date.now(), message: "This receipt could not be copied. Use Print receipt instead.", tone: "error" });
    }
  };

  return (
    <div className={styles.receiptOverlay} data-studentsave-receipt>
      <section className={styles.receiptDialog} role="dialog" aria-modal="true" aria-labelledby="receiptTitle">
        <div className={styles.receiptActions}>
          <button type="button" onClick={() => window.print()}>Print receipt</button>
          <button type="button" onClick={shareReceipt}>Share receipt</button>
          <button type="button" onClick={onClose}>Done</button>
        </div>
        <div className={styles.receiptPaper}>
          <Image className={styles.receiptLogo} src="/student-save-logo-dark.svg" alt="StudentSave" width={200} height={48} priority />
          <div className={styles.receiptStatus} data-status={transaction.status}><span aria-hidden="true">{transaction.status === "pending" ? "…" : transaction.status === "failed" ? "×" : "✓"}</span>{statusText}</div>
          <h2 id="receiptTitle">Transaction receipt</h2>
          <p className={styles.receiptNumber}>Receipt {transaction.receiptNumber || transaction.id}</p>
          <strong className={`${styles.receiptAmount} ${isSuccessfulCredit(transaction) ? "funds-added-amount" : ""}`}>{isIncome ? "+" : "−"}₦{transaction.amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          <dl className={styles.receiptDetails}>
            <div><dt>{isIncome ? "Source" : "Recipient"}</dt><dd>{isIncome ? transaction.category : transaction.recipientName || "—"}</dd></div>
            <div><dt>Bank</dt><dd>{transaction.recipientBank || "—"}</dd></div>
            <div><dt>Account number</dt><dd>{account}</dd></div>
            <div><dt>Transaction type</dt><dd>{isWithdrawal ? "Cash withdrawal" : transaction.category}</dd></div>
            <div><dt>Date and time</dt><dd>{new Date(date).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
            <div><dt>Transaction ID</dt><dd>{transaction.id}</dd></div>
          </dl>
          <p className={styles.receiptNote}>Simulated receipt · No real money was transferred</p>
        </div>
      </section>
      {toast && <TransactionSuccessPopup key={toast.id} message={toast.message} tone={toast.tone} />}
    </div>
  );
}
