"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAdminClient, createClient } from "@repo/supabase/browser";
import { AuthFrame } from "../_components/AuthFrame";
import styles from "../auth.module.css";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    const { data: isAdmin } = error ? { data: false } : await supabase.rpc("is_admin");
    if (error) {
      setSubmitting(false);
      setNotice(error.code === "invalid_credentials" ? "That email and password don’t match." : "We couldn’t sign you in. Try again.");
      return;
    }
    if (isAdmin) {
      // Signing out revokes this session, so admins sign in again under their own cookie.
      await supabase.auth.signOut({ scope: "local" });
      await createAdminClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    }
    setSubmitting(false);
    router.push(isAdmin ? "/admin/student-verifications" : "/dashboard");
  }

  return (
    <AuthFrame>
      <div className={styles.formHeading}>
        <h1>Welcome back</h1>
        <p>Sign in to continue with StudentSave.</p>
      </div>
      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={(event) => { setEmail(event.target.value); setNotice(""); }} />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <div className={styles.secretField}><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Your password" required value={password} onChange={(event) => { setPassword(event.target.value); setNotice(""); }} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          <Link className={styles.forgotLink} href="/auth/forgot-password">Forgot password?</Link>
        </div>
        {notice && <p className={styles.formNotice} role="status">{notice}</p>}
        <button className={styles.submitButton} type="submit" disabled={submitting} aria-busy={submitting}>Sign in</button>
      </form>
      <div className={styles.signinBox}>New to StudentSave? <Link href="/auth/sign-up">Create an account</Link></div>
    </AuthFrame>
  );
}
