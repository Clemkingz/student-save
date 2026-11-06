"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAdminClient } from "@repo/supabase/browser";
import { AuthFrame } from "../../auth/_components/AuthFrame";
import styles from "../../auth/auth.module.css";

export default function AdminSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");
    const supabase = createAdminClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      setSubmitting(false);
      setNotice(error.code === "invalid_credentials" ? "That email and password don’t match." : "We couldn’t sign you in. Try again.");
      return;
    }
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      await supabase.auth.signOut({ scope: "local" });
      setSubmitting(false);
      setNotice("This account is not an admin.");
      return;
    }
    router.replace("/admin/student-verifications");
  }

  return (
    <AuthFrame>
      <div className={styles.formHeading}>
        <h1>Admin sign in</h1>
        <p>Any student signed in on this browser stays signed in.</p>
      </div>
      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <div className={styles.secretField}><input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
        </div>
        {notice && <p className={styles.formNotice} role="status">{notice}</p>}
        <button className={styles.submitButton} type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? "Signing in…" : "Sign in"}</button>
      </form>
      <div className={styles.signinBox}>Are you a student? <Link href="/auth/sign-in">Student sign in</Link></div>
    </AuthFrame>
  );
}
