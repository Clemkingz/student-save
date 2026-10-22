"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthFrame } from "../_components/AuthFrame";
import { hashMockPassword } from "../_components/password";
import styles from "../auth.module.css";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const savedHash = localStorage.getItem(`studentsave:password-hash:${normalizedEmail}`);
    if (!savedHash) {
      setNotice("No mock password is saved for this account. Use Forgot password to set one.");
      return;
    }
    if (await hashMockPassword(password) !== savedHash) {
      setNotice("That email and password do not match the saved mock account.");
      return;
    }
    localStorage.setItem("studentsave:active-email", normalizedEmail);
    router.push(`/dashboard?email=${encodeURIComponent(normalizedEmail)}`);
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
        <div className={styles.signinBox}><Link href="/auth/forgot-password">Forgot password?</Link></div>
        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <div className={styles.secretField}><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Your password" required value={password} onChange={(event) => { setPassword(event.target.value); setNotice(""); }} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
        </div>
        {notice && <p className={styles.formNotice} role="status">{notice}</p>}
        <button className={styles.submitButton} type="submit">Sign in</button>
      </form>
      <div className={styles.signinBox}>New to StudentSave? <Link href="/auth/sign-up">Create an account</Link></div>
    </AuthFrame>
  );
}
