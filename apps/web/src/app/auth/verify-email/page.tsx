"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFrame } from "../_components/AuthFrame";
import modal from "./verification.module.css";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "amaka@mail.com";
  const storageKey = `studentsave:email-verification:${email.toLowerCase()}`;
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const code = digits.join("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [notice, setNotice] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    inputRefs.current[0]?.focus({ preventScroll: true });
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const record = JSON.parse(saved) as { verified?: boolean };
        setVerified(record.verified === true);
        return;
      } catch {
        // Replace invalid mock data with a fresh verification record.
      }
    }
    localStorage.setItem(storageKey, JSON.stringify({ verified: false }));
    setVerified(false);
  }, [storageKey]);

  useEffect(() => {
    if (!verified) return;
    dialogRef.current?.focus({ preventScroll: true });
    const timeout = window.setTimeout(() => {
      router.replace(`/auth/wallet-setup?email=${encodeURIComponent(email)}`);
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [email, router, verified]);

  useEffect(() => {
    if (verified || !/^\d{6}$/.test(code)) return;
    setNotice("");
    localStorage.setItem(storageKey, JSON.stringify({ code, verified: true }));
    const pendingSignup = localStorage.getItem("studentsave:pending-signup");
    if (pendingSignup) {
      try {
        const profile = JSON.parse(pendingSignup) as { fullName?: string; email?: string };
        if (profile.email?.toLowerCase() === email.toLowerCase()) {
          localStorage.setItem(`studentsave:mock-account:${email.toLowerCase()}`, JSON.stringify({
            fullName: profile.fullName || "",
            email: profile.email,
            emailVerified: true,
            verifiedAt: new Date().toISOString(),
          }));
          localStorage.removeItem("studentsave:pending-signup");
        }
      } catch {
        localStorage.removeItem("studentsave:pending-signup");
      }
    }
    setVerified(true);
  }, [code, email, storageKey, verified]);

  function handleResend() {
    localStorage.setItem(storageKey, JSON.stringify({ verified: false }));
    setVerified(false);
    setDigits(Array(6).fill(""));
    inputRefs.current[0]?.focus({ preventScroll: true });
    setNotice("Mock code resent. Enter any six digits to continue.");
  }

  function fillDigits(value: string, index: number) {
    const incoming = value.replace(/\D/g, "").slice(0, 6 - index);
    if (!incoming) return;
    setDigits((current) => {
      const next = [...current];
      [...incoming].forEach((digit, offset) => { next[index + offset] = digit; });
      return next;
    });
    setNotice("");
    inputRefs.current[Math.min(index + incoming.length, 5)]?.focus({ preventScroll: true });
  }

  function closeModal() {
    router.push("/auth/sign-up");
  }

  return (
    <AuthFrame>
      <dialog
        ref={dialogRef}
        className={modal.dialog}
        aria-labelledby={verified ? "verification-success-title" : "verification-title"}
        aria-describedby={verified ? undefined : "verification-description"}
        onKeyDown={(event) => {
          if (verified || event.target instanceof HTMLInputElement || event.ctrlKey || event.metaKey || event.altKey) return;
          if (/^[0-9]$/.test(event.key)) {
            event.preventDefault();
            const nextEmpty = digits.findIndex((digit) => !digit);
            fillDigits(event.key, nextEmpty === -1 ? 0 : nextEmpty);
          }
        }}
        onCancel={(event) => { event.preventDefault(); if (!verified) closeModal(); }}
      >
        <button className={modal.close} type="button" aria-label="Return to sign up" onClick={closeModal} disabled={verified}>×</button>
        <div className={modal.stage}>
          <div className={`${modal.entry} ${verified ? modal.hidden : ""}`} inert={verified} aria-hidden={verified}>
            <div className={modal.icon} aria-hidden="true">
              <svg viewBox="0 0 32 32"><rect x="5" y="8" width="22" height="16" rx="3" /><path d="m6 10 10 8 10-8" /></svg>
            </div>
            <h1 id="verification-title">Verify your email</h1>
          <p className={modal.description} id="verification-description">Enter any 6-digit code to verify <strong>{email}</strong></p>
          <div>
            <div className={modal.digits} role="group" aria-label="Six-digit verification code"
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                const nextEmpty = digits.findIndex((digit) => !digit);
                inputRefs.current[nextEmpty === -1 ? 0 : nextEmpty]?.focus({ preventScroll: true });
              }}
            >
              {digits.map((digit, index) => <input
                key={index}
                ref={(element) => { inputRefs.current[index] = element; }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${index + 1} of 6`}
                value={digit}
                autoFocus={index === 0}
                onFocus={(event) => event.target.select()}
                onChange={(event) => {
                  if (!event.target.value) {
                    setDigits((current) => current.map((value, position) => position === index ? "" : value));
                    setNotice("");
                  } else fillDigits(event.target.value, index);
                }}
                onPaste={(event) => { event.preventDefault(); fillDigits(event.clipboardData.getData("text"), index); }}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !digit && index > 0) {
                    event.preventDefault();
                    setDigits((current) => current.map((value, position) => position === index - 1 ? "" : value));
                    inputRefs.current[index - 1]?.focus({ preventScroll: true });
                  }
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                    event.preventDefault();
                    inputRefs.current[Math.max(0, Math.min(5, index + (event.key === "ArrowLeft" ? -1 : 1)))]?.focus({ preventScroll: true });
                  }
                }}
              />)}
            </div>
            <div className={modal.feedback}>
              {notice && <p role="status">{notice}</p>}
            </div>
          </div>
          <p className={modal.resend}>Didn’t receive a code? <button type="button" onClick={handleResend}>Resend code</button></p>
          <p className={modal.hint}>Email verification confirms you own this address. It is not proof of student status.</p>
          </div>
          <div className={`${modal.success} ${verified ? modal.visible : ""}`} inert={!verified} aria-hidden={!verified}>
            <div className={`${modal.icon} ${verified ? modal.successIcon : ""}`} aria-hidden="true">
              <svg viewBox="0 0 32 32"><path d="m8 16 5.2 5.2L24 10.5" /></svg>
            </div>
            <h1 id="verification-success-title">Email verified</h1>
            <p className={modal.description} role="status">{verified ? "Taking you to wallet setup…" : ""}</p>
          </div>
        </div>
      </dialog>
    </AuthFrame>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
