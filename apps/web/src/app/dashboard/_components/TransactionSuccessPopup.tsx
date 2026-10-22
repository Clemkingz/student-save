"use client";

import { useEffect, useState } from "react";
import styles from "../dashboard.module.css";

export function TransactionSuccessPopup({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 1500);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;
  return <div className={styles.transactionSuccessPopup} role="status" aria-live="polite"><span aria-hidden="true">🎉</span><strong>{message}</strong></div>;
}
