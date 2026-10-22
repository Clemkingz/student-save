"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthFrame } from "../_components/AuthFrame";
import { hashMockPassword } from "../_components/password";
import styles from "../auth.module.css";

type FieldName = "fullName" | "email" | "password" | "confirmPassword";
type FormValues = Record<FieldName, string>;
type FormErrors = Partial<Record<FieldName, string>>;

const initialValues: FormValues = { fullName: "", email: "", password: "", confirmPassword: "" };

export default function SignUpPage() {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function updateField(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setNotice("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};

    if (!values.fullName.trim()) nextErrors.fullName = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (values.password.length < 8) nextErrors.password = "Use at least 8 characters for your password.";
    if (values.confirmPassword !== values.password) nextErrors.confirmPassword = "Your passwords don’t match.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      const email = values.email.trim().toLowerCase();
      const passwordHash = await hashMockPassword(values.password);
      localStorage.setItem(`studentsave:password-hash:${email}`, passwordHash);
      localStorage.setItem("studentsave:pending-signup", JSON.stringify({
        fullName: values.fullName.trim(),
        email,
        createdAt: new Date().toISOString(),
      }));
      localStorage.setItem("studentsave:active-email", email);
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    }
  }

  return (
    <AuthFrame>
      <div className={styles.formHeading}>
        <h1>Create your account</h1>
        <p>Track income, expenses and savings in one place.</p>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="fullName">Full name</label>
          <input id="fullName" name="fullName" type="text" autoComplete="name" placeholder="e.g. Amaka Obi" required value={values.fullName} onChange={(event) => updateField("fullName", event.target.value)} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? "fullName-error" : undefined} />
          {errors.fullName && <span className={styles.fieldError} id="fullName-error">{errors.fullName}</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required value={values.email} onChange={(event) => updateField("email", event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />
          {errors.email && <span className={styles.fieldError} id="email-error">{errors.email}</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <div className={styles.secretField}><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" minLength={8} required value={values.password} onChange={(event) => updateField("password", event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          {errors.password && <span className={styles.fieldError} id="password-error">{errors.password}</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPassword">Confirm password</label>
          <div className={styles.secretField}><input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" placeholder="Repeat your password" required value={values.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined} /><button type="button" aria-label={showConfirmPassword ? "Hide password" : "Show password"} onClick={() => setShowConfirmPassword((visible) => !visible)}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          {errors.confirmPassword && <span className={styles.fieldError} id="confirmPassword-error">{errors.confirmPassword}</span>}
        </div>

        {notice && <p className={styles.formNotice} role="status">{notice}</p>}
        <button className={styles.submitButton} type="submit">Create account</button>
      </form>

      <div className={styles.signinBox}>Already have an account? <Link href="/auth/sign-in">Sign in</Link></div>
    </AuthFrame>
  );
}
