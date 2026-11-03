"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@repo/supabase/browser";
import { AuthFrame } from "../_components/AuthFrame";
import styles from "../auth.module.css";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords don’t match.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await createClient().auth.updateUser({ password: newPassword });
    setSaving(false);
    if (updateError) {
      setError("That reset link is invalid or expired. Request a new one.");
      return;
    }
    setError("");
    setNotice("Password reset. Taking you to your dashboard.");
    window.setTimeout(() => router.push("/dashboard"), 900);
  }

  return (
    <AuthFrame>
      <div className={styles.formHeading}>
        <h1>Choose a new password</h1>
        <p>Use at least 8 characters.</p>
      </div>
      <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}><label htmlFor="newPassword">New password</label><input id="newPassword" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setError(""); }} required /></div>
        <div className={styles.field}><label htmlFor="confirmPassword">Confirm new password</label><input id="confirmPassword" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setError(""); }} required /></div>
        {error && <p className={styles.fieldError} role="alert">{error}</p>}
        {notice && <p className={styles.verificationSuccess} role="status">{notice}</p>}
        <button className={styles.submitButton} type="submit" disabled={saving}>Reset password</button>
      </form>
      <div className={styles.signinBox}>Need a new link? <Link href="/auth/forgot-password">Request one</Link></div>
    </AuthFrame>
  );
}
