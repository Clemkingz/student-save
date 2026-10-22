"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFrame } from "../_components/AuthFrame";
import styles from "../auth.module.css";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "amaka@mail.com";
  const storageKey = `studentsave:email-verification:${email.toLowerCase()}`;
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mockCode, setMockCode] = useState("");
  const [verified, setVerified] = useState(false);

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
    setCode("");
    setNotice("A new mock verification code is ready: 123456");
    setError("");
  }

  return (
    <AuthFrame>
      <div className={styles.formHeading}>
        <h1>Verify your email</h1>
        <p>We sent a time-limited link and code to {email}.</p>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="verificationCode">Verification code</label>
          <input
            id="verificationCode"
            name="verificationCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="6-digit code"
            value={code}
            disabled={verified}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
              setNotice("");
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "verificationCode-error" : undefined}
          />
          {error && <span className={styles.fieldError} id="verificationCode-error">{error}</span>}
        </div>

        <button className={styles.submitButton} type="submit" disabled={verified}>Verify email</button>
      </form>

      <p className={styles.verificationHint}>
        Email verification confirms you own this address. It is not proof of student status.
      </p>

      {!verified && <button className={styles.secondaryButton} type="button" onClick={handleResend}>Resend link</button>}

      <p className={styles.mockCodeNotice}>Mock email code: <strong>{mockCode || "Loading…"}</strong></p>
      {notice && <p className={styles.formNotice} role="status">{notice}</p>}
      {verified && <div className={styles.verificationSuccessPopup} role="status" aria-live="polite"><span className={styles.verificationCheck} aria-hidden="true"><svg viewBox="0 0 32 32"><path d="m8 16 5.2 5.2L24 10.5" /></svg></span><strong>Email verified</strong><span>Taking you to wallet setup…</span></div>}
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
