"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthFrame } from "../_components/AuthFrame";
import { hashMockPassword } from "../_components/password";
import styles from "../auth.module.css";

type MockReset = { code: string; expiresAt: number };

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetStarted, setResetStarted] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function sendResetCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Enter the email address for your account.");
      return;
    }
    const reset: MockReset = { code: "123456", expiresAt: Date.now() + 10 * 60 * 1000 };
    localStorage.setItem(`studentsave:password-reset:${normalizedEmail}`, JSON.stringify(reset));
    setEmail(normalizedEmail);
    setResetStarted(true);
    setError("");
    setNotice("Mock reset code: 123456. It expires in 10 minutes.");
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit reset code.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords don’t match.");
      return;
    }
    let reset: MockReset | null = null;
    try {
      const saved = localStorage.getItem(`studentsave:password-reset:${email}`);
      reset = saved ? JSON.parse(saved) as MockReset : null;
    } catch {
      reset = null;
    }
    if (!reset || reset.code !== code || reset.expiresAt < Date.now()) {
      setError("That reset code is invalid or expired. Request a new one.");
      setNotice("");
      return;
    }
    localStorage.setItem(`studentsave:password-hash:${email}`, await hashMockPassword(newPassword));
    localStorage.removeItem(`studentsave:password-reset:${email}`);
    setError("");
    setNotice("Password reset. You can now sign in with your new password.");
    window.setTimeout(() => router.push("/auth/sign-in"), 900);
  }

  return (
    <AuthFrame>
      <div className={styles.formHeading}>
        <h1>Reset your password</h1>
        <p>Get a mock reset code and choose a new password.</p>
      </div>
      {!resetStarted ? (
        <form className={styles.formCard} onSubmit={sendResetCode} noValidate>
          <div className={styles.field}><label htmlFor="resetEmail">Email</label><input id="resetEmail" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} required /></div>
          {error && <p className={styles.fieldError} role="alert">{error}</p>}
          <button className={styles.submitButton} type="submit">Send reset code</button>
        </form>
      ) : (
        <form className={styles.formCard} onSubmit={resetPassword} noValidate>
          <div className={styles.field}><label htmlFor="resetCode">6-digit reset code</label><input id="resetCode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "")); setError(""); }} required /></div>
          <div className={styles.field}><label htmlFor="newPassword">New password</label><input id="newPassword" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setError(""); }} required /></div>
          <div className={styles.field}><label htmlFor="confirmPassword">Confirm new password</label><input id="confirmPassword" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setError(""); }} required /></div>
          {error && <p className={styles.fieldError} role="alert">{error}</p>}
          {notice && <p className={styles.verificationSuccess} role="status">{notice}</p>}
          <button className={styles.submitButton} type="submit">Reset password</button>
        </form>
      )}
      {notice && !resetStarted && <p className={styles.verificationHint} role="status">{notice}</p>}
      <div className={styles.signinBox}>Remembered your password? <Link href="/auth/sign-in">Back to sign in</Link></div>
    </AuthFrame>
  );
}
