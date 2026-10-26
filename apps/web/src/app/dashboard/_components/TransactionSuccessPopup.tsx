"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle, X, AlertCircle } from "lucide-react";
import styles from "../dashboard.module.css";

export function TransactionSuccessPopup({ message, tone = "neutral", children }: { message: string; tone?: "neutral" | "success" | "error"; children?: ReactNode }) {
  const [closing, setClosing] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timeout = window.setTimeout(() => setClosing(true), 3500);
    return () => window.clearTimeout(timeout);
  }, []);
  useEffect(() => {
    if (!closing) return;
    const timeout = window.setTimeout(() => setVisible(false), 250);
    return () => window.clearTimeout(timeout);
  }, [closing]);
  if (!visible) return null;
  return <div className={`${styles.toast} ${closing ? styles.toastClosing : ""}`} data-tone={tone} role="status" aria-live="polite">
    {tone === "error" ? <AlertCircle size={22} aria-hidden="true" /> : <CheckCircle size={22} aria-hidden="true" />}
    <div><strong>{message}</strong>{children}</div>
    <button type="button" aria-label="Dismiss notification" onClick={() => setClosing(true)}><X size={18} /></button>
  </div>;
}
