"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@repo/supabase/browser";
import { AuthFrame } from "../_components/AuthFrame";
import styles from "../auth.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);

  async function sendResetLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Enter the email address for your account.");
      return;
    }
    setSending(true);
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setSending(false);
    if (resetError) {
      setError(resetError.status === 429 ? "Too many reset emails. Try again later." : "We couldn’t send a reset link. Try again.");
      return;
    }
    setError("");
    setNotice("If that email has an account, a reset link is on its way. Open it in this browser.");
  }

  return (
    <AuthFrame>
      <div className={styles.formHeading}>
        <h1>Reset your password</h1>
        <p>We’ll email you a link to choose a new password.</p>
      </div>
      <form className={styles.formCard} onSubmit={sendResetLink} noValidate>
        <div className={styles.field}><label htmlFor="resetEmail">Email</label><input id="resetEmail" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); setNotice(""); }} required /></div>
        {error && <p className={styles.fieldError} role="alert">{error}</p>}
        {notice && <p className={styles.verificationSuccess} role="status">{notice}</p>}
        <button className={styles.submitButton} type="submit" disabled={sending} aria-busy={sending}>Send reset link</button>
      </form>
      <div className={styles.signinBox}>Remembered your password? <Link href="/auth/sign-in">Back to sign in</Link></div>
    </AuthFrame>
  );
}
