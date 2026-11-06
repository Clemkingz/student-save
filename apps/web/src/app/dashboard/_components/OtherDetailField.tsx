"use client";

import styles from "../dashboard.module.css";

export { OTHER, resolveOther } from "./otherOption";

/** A text box that appears under a select when the student chooses "Other". */
export function OtherDetailField({ id, label, value, onChange, placeholder, maxLength = 60 }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div className={`${styles.transactionField} ${styles.otherDetail}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" required maxLength={maxLength} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} autoFocus />
      <span className={styles.transactionFootnote}>{value.trim().length}/{maxLength} characters</span>
    </div>
  );
}
