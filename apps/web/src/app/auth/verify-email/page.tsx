"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
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
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mockCode, setMockCode] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const record = JSON.parse(saved) as { code?: string; verified?: boolean };
        if (record.code && /^\d{6}$/.test(record.code)) {
          setMockCode(record.code);
          setVerified(Boolean(record.verified));
          return;
        }
      } catch {
        // Replace invalid mock data with a fresh verification record.
      }
    }

    const initialCode = "123456";
    localStorage.setItem(storageKey, JSON.stringify({ code: initialCode, verified: false }));
    setMockCode(initialCode);
  }, [storageKey]);

  useEffect(() => {
    if (!verified) return;
    const timeout = window.setTimeout(() => {
      router.replace(`/auth/wallet-setup?email=${encodeURIComponent(email)}`);
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [email, router, verified]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setError("");
    if (code !== mockCode) {
      setNotice("");
      setError("That code doesn’t match. Check the mock code below and try again.");
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify({ code: mockCode, verified: true }));
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
  }

  function handleResend() {
    const nextCode = "123456";
    localStorage.setItem(storageKey, JSON.stringify({ code: nextCode, verified: false }));
    setMockCode(nextCode);
    setVerified(false);
    setDigits(Array(6).fill(""));
    inputRefs.current[0]?.focus();
    setNotice("A new mock verification code is ready: 123456");
    setError("");
  }

  function fillDigits(value: string, index: number) {
    const incoming = value.replace(/\D/g, "").slice(0, 6 - index);
    if (!incoming) return;
    setDigits((current) => {
      const next = [...current];
      [...incoming].forEach((digit, offset) => { next[index + offset] = digit; });
      return next;
    });
    setError("");
    setNotice("");
    inputRefs.current[Math.min(index + incoming.length, 5)]?.focus();
  }

  function closeModal() {
    router.push("/auth/sign-up");
  }

  return (
    <AuthFrame>
      <dialog
        ref={dialogRef}
        className={modal.dialog}
        aria-labelledby="verification-title"
        aria-describedby={verified ? undefined : "verification-description"}
        onCancel={(event) => { event.preventDefault(); if (!verified) closeModal(); }}
      >
        <button className={modal.close} type="button" aria-label="Return to sign up" onClick={closeModal} disabled={verified}>×</button>
        <div className={`${modal.icon} ${verified ? modal.successIcon : ""}`} aria-hidden="true">
          <svg viewBox="0 0 32 32">{verified ? <path d="m8 16 5.2 5.2L24 10.5" /> : <><rect x="5" y="8" width="22" height="16" rx="3" /><path d="m6 10 10 8 10-8" /></>}</svg>
        </div>
        <h1 id="verification-title">{verified ? "Email verified" : "Verify your email"}</h1>
        {verified ? <p className={modal.description} role="status">Taking you to wallet setup…</p> : <>
          <p className={modal.description} id="verification-description">Enter the 6-digit code sent to <strong>{email}</strong></p>
          <form onSubmit={handleSubmit} noValidate>
            <div className={modal.digits} role="group" aria-label="Six-digit verification code">
              {digits.map((digit, index) => <input
                key={index}
                ref={(element) => { inputRefs.current[index] = element; }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${index + 1} of 6`}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "verification-error" : "mock-code"}
                value={digit}
                autoFocus={index === 0}
                onFocus={(event) => event.target.select()}
                onChange={(event) => {
                  if (!event.target.value) {
                    setDigits((current) => current.map((value, position) => position === index ? "" : value));
                    setError("");
                    setNotice("");
                  } else fillDigits(event.target.value, index);
                }}
                onPaste={(event) => { event.preventDefault(); fillDigits(event.clipboardData.getData("text"), index); }}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !digit && index > 0) {
                    event.preventDefault();
                    setDigits((current) => current.map((value, position) => position === index - 1 ? "" : value));
                    inputRefs.current[index - 1]?.focus();
                    setError("");
                  }
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                    event.preventDefault();
                    inputRefs.current[Math.max(0, Math.min(5, index + (event.key === "ArrowLeft" ? -1 : 1)))]?.focus();
                  }
                }}
              />)}
            </div>
            <div className={modal.feedback}>
              {error && <p className={modal.error} id="verification-error" role="alert">{error}</p>}
              {notice && <p role="status">{notice}</p>}
            </div>
            <button className={modal.verify} type="submit" disabled={code.length !== 6 || !mockCode}>Verify email <span aria-hidden="true">→</span></button>
          </form>
          <p className={modal.resend}>Didn’t receive a code? <button type="button" onClick={handleResend}>Resend code</button></p>
          <p className={modal.mock} id="mock-code">Mock email code: <strong>{mockCode || "Loading…"}</strong></p>
          <p className={modal.hint}>Email verification confirms you own this address. It is not proof of student status.</p>
        </>}
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
