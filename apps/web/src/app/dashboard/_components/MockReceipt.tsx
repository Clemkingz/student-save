"use client";

import { isSuccessfulCredit } from "./mockFinance";

import Image from "next/image";
import type { MockTransaction } from "./mockFinance";
import styles from "./mockReceipt.module.css";

export function MockReceipt({ transaction, onClose }: { transaction: MockTransaction; onClose: () => void }) {
  const isWithdrawal = transaction.category === "Withdrawal";
  const isIncome = transaction.type === "income";
  const date = transaction.receiptCreatedAt || `${transaction.date}T12:00:00`;
  const account = transaction.recipientAccountNumber || "—";
  const shareReceipt = async () => {
    const summary = `StudentSave receipt ${transaction.receiptNumber || transaction.id}\n${isIncome ? "Funds added" : isWithdrawal ? "Withdrawal" : transaction.category}: ${isIncome ? "+" : "−"}₦${transaction.amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nDate: ${new Date(date).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`;
    if (navigator.share) {
      try { await navigator.share({ title: "StudentSave receipt", text: summary }); return; } catch { /* The user may cancel sharing. */ }
    }
    try { await navigator.clipboard.writeText(summary); window.alert("Receipt details copied. You can paste and share them."); } catch { window.alert(summary); }
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
          <div className={styles.receiptStatus}><span aria-hidden="true">✓</span>{isIncome ? "Funds added successfully" : isWithdrawal ? "Withdrawal successful" : "Payment successful"}</div>
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
          <p className={styles.receiptNote}>Mock receipt for testing · No real money was transferred.</p>
        </div>
      </section>
    </div>
  );
}
