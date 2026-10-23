"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import styles from "../dashboard.module.css";

export function GoalDialog({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    // Native modal dialogs make the background inert, trap focus and handle Esc.
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);

  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first || !last) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

  return (
    <dialog ref={dialog} className={`${styles.paymentDialog} ${styles.goalDialog}`} aria-modal="true" aria-labelledby={titleId} onKeyDown={trapFocus} onCancel={onClose}>
      <h2 id={titleId}>{title}</h2>
      <button className={styles.paymentClose} type="button" aria-label="Close dialog" onClick={onClose}>×</button>
      {children}
    </dialog>
  );
}
