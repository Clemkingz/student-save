"use client";

import { useId } from "react";
import styles from "./animatedPadlock.module.css";

export function AnimatedPadlock({ state = "locking" }: { state?: "locking" | "locked" }) {
  const gradient = useId();
  return <div className={styles.padlock} data-state={state} role="status" aria-live="polite">
    <svg viewBox="0 0 120 140" width="96" height="112" aria-hidden="true">
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--brand-green-bright)" /><stop offset="1" stopColor="var(--primary-800)" /></linearGradient></defs>
      <path className={styles.shackle} d="M35 70V43a25 25 0 0 1 50 0v27" fill="none" stroke="var(--brand-lime)" strokeWidth="10" strokeLinecap="round" />
      <g className={styles.body}><rect x="18" y="62" width="84" height="65" rx="16" fill={`url(#${gradient})`} /><circle cx="60" cy="88" r="7" fill="var(--brand-mint)" /><path d="M60 92v14" stroke="var(--brand-mint)" strokeWidth="6" strokeLinecap="round" /></g>
    </svg>
    <strong className={styles.caption}>Savings locked</strong>
  </div>;
}
