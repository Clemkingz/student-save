"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@repo/supabase/browser";
import { DashboardFrame } from "../_components/DashboardFrame";
import { GoalDialog } from "../_components/GoalDialog";
import { useDashboardSession } from "../_components/useDashboardSession";
import styles from "../dashboard.module.css";

type Notifications = { inApp: boolean; email: boolean; push: boolean };
const defaultNotifications: Notifications = { inApp: true, email: true, push: false };

function SettingsContent() {
  const router = useRouter();
  const { userId, email, wallet, ready } = useDashboardSession();
  const [name, setName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPinForm, setShowPinForm] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pinPassword, setPinPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!ready || !email) return;
    setName(wallet?.ownerName || email);
    void createClient().from("notification_preferences").select("*").maybeSingle().then(({ data }) => {
      if (data) setNotifications({ inApp: data.in_app, email: data.email, push: data.push });
    });
  }, [email, ready, wallet]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = nameDraft.trim();
    if (!nextName) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({ full_name: nextName }).eq("id", user?.id ?? "");
    if (error) {
      setNotice("We couldn’t update your profile. Try again.");
      return;
    }
    setName(nextName);
    setEditingProfile(false);
    setNotice("Profile updated.");
  }

  async function toggleNotification(key: keyof Notifications) {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    const { error } = await createClient().from("notification_preferences").update({ in_app: next.inApp, email: next.email, push: next.push }).eq("user_id", userId);
    setNotice(error ? "Notification preferences could not be saved." : "Notification preferences saved.");
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!oldPassword) {
      setPasswordError("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Use at least 8 characters for your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords don’t match.");
      return;
    }
    const supabase = createClient();
    const { error: currentPasswordError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
    if (currentPasswordError) {
      setPasswordError("Your current password is incorrect.");
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setPasswordError(updateError.code === "same_password" ? "Choose a password you haven’t used here." : "We couldn’t change your password. Try again.");
      return;
    }
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setShowPasswordForm(false);
    setNotice("Password changed.");
  }

  async function resetPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{4}$/.test(newPin)) {
      setPinError("Enter a 4-digit PIN.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("The PINs don’t match.");
      return;
    }
    const { data, error } = await createClient().rpc("reset_pin", { p_password: pinPassword, p_new_pin: newPin });
    const code = (data as { code?: string } | null)?.code;
    if (error || code) {
      setPinError(code === "password_incorrect" ? "Your password is incorrect." : code === "pin_locked" ? "Too many wrong attempts. Try again in 15 minutes." : "We couldn’t reset your PIN. Try again.");
      return;
    }
    setPinPassword("");
    setNewPin("");
    setConfirmPin("");
    setPinError("");
    setShowPinForm(false);
    setNotice("PIN reset.");
  }

  async function logOut() {
    await createClient().auth.signOut();
    router.replace("/auth/sign-in");
  }

  async function deleteAccount() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.functions.invoke("delete-account");
    setDeleting(false);
    if (error) {
      setConfirmingDelete(false);
      setNotice("Your account could not be deleted. Try again.");
      return;
    }
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/auth/sign-up");
  }

  async function exportData() {
    const { data, error } = await createClient().rpc("export_my_data");
    if (error || !(data as { ok?: boolean } | null)?.ok) {
      setNotice("Your data could not be exported. Try again.");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "studentsave-data.json";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Your data export has been downloaded.");
  }

  if (!ready) return <main className={styles.mainContent} aria-live="polite">Loading settings…</main>;

  return (
    <DashboardFrame email={email} active="Account">
      <header className={styles.pageHeading}>
        <h1>Account</h1>
        <p>Profile, security and notifications.</p>
      </header>

      <div className={styles.settingsGrid}>
        <section className={styles.panel}>
          <h2>Profile</h2>
          {editingProfile ? (
            <form className={styles.settingsProfileForm} onSubmit={saveProfile}>
              <label htmlFor="profileName">Account name</label>
              <input id="profileName" value={nameDraft} maxLength={80} onChange={(event) => setNameDraft(event.target.value)} required />
              <div className={styles.settingsInlineActions}><button className={styles.primaryAction} type="submit">Save profile</button><button className={styles.secondaryAction} type="button" onClick={() => setEditingProfile(false)}>Cancel</button></div>
            </form>
          ) : (
            <div className={styles.settingsRows}>
              <div className={styles.settingsRow}><div><strong>{name}</strong><span>{email}</span></div><button className={styles.settingsTextButton} type="button" onClick={() => { setNameDraft(name); setEditingProfile(true); }}>Edit</button></div>
              <div className={styles.settingsRow}><div><strong>Account currency</strong><span>{wallet?.currency === "NGN" || !wallet?.currency ? "Nigerian Naira (NGN ₦)" : wallet.currency}</span></div></div>
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <h2>Notifications</h2>
          <div className={styles.settingsRows}>
            <div className={styles.settingsRow}><div><strong>In-app</strong><span>Budget and goal alerts</span></div><button className={`${styles.settingsToggle} ${notifications.inApp ? styles.settingsToggleOn : ""}`} type="button" role="switch" aria-checked={notifications.inApp} aria-label="In-app notifications" onClick={() => void toggleNotification("inApp")}><span /></button></div>
            <div className={styles.settingsRow}><div><strong>Email</strong><span>Selected reminders</span></div><button className={`${styles.settingsToggle} ${notifications.email ? styles.settingsToggleOn : ""}`} type="button" role="switch" aria-checked={notifications.email} aria-label="Email notifications" onClick={() => void toggleNotification("email")}><span /></button></div>
            <div className={styles.settingsRow}><div><strong>Push</strong><span>Needs browser permission</span></div><button className={`${styles.settingsToggle} ${notifications.push ? styles.settingsToggleOn : ""}`} type="button" role="switch" aria-checked={notifications.push} aria-label="Push notifications" onClick={() => void toggleNotification("push")}><span /></button></div>
          </div>
        </section>
      </div>

      <Link className={styles.studentVerificationLink} href="/dashboard/student-verification">
        <span><strong>Student verification</strong><small>Upload your school ID and add your institution details.</small></span>
        <b aria-hidden="true">→</b>
      </Link>

      <p className={styles.disclaimer}>Push notifications also depend on your browser or device permission.</p>

      <div className={styles.settingsActions}>
        <button className={styles.secondaryAction} type="button" onClick={() => { setShowPasswordForm((value) => !value); setPasswordError(""); setNotice(""); }}>Change password</button>
        <button className={styles.secondaryAction} type="button" onClick={() => { setShowPinForm((value) => !value); setPinError(""); setNotice(""); }}>Forgot PIN</button>
        <button className={styles.secondaryAction} type="button" onClick={exportData}>Export my data</button>
      </div>

      {showPasswordForm && <form className={`${styles.panel} ${styles.settingsPasswordForm}`} onSubmit={changePassword}>
        <h2>Change password</h2>
        <div className={styles.transactionField}><label htmlFor="oldPassword">Current password</label><input id="oldPassword" type="password" autoComplete="current-password" value={oldPassword} onChange={(event) => { setOldPassword(event.target.value); setPasswordError(""); }} required /></div>
        <div className={styles.transactionField}><label htmlFor="newPassword">New password</label><input id="newPassword" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setPasswordError(""); }} required /></div>
        <div className={styles.transactionField}><label htmlFor="confirmNewPassword">Confirm new password</label><input id="confirmNewPassword" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setPasswordError(""); }} required /></div>
        {passwordError && <p className={styles.goalError} role="alert">{passwordError}</p>}
        <button className={styles.primaryAction} type="submit">Save new password</button>
      </form>}
      {showPinForm && <form className={`${styles.panel} ${styles.settingsPasswordForm}`} onSubmit={resetPin}>
        <h2>Reset PIN</h2>
        <div className={styles.transactionField}><label htmlFor="pinPassword">Account password</label><input id="pinPassword" type="password" autoComplete="current-password" value={pinPassword} onChange={(event) => { setPinPassword(event.target.value); setPinError(""); }} required /></div>
        <div className={styles.transactionField}><label htmlFor="newPin">New PIN</label><input id="newPin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={newPin} onChange={(event) => { setNewPin(event.target.value.replace(/\D/g, "")); setPinError(""); }} required /></div>
        <div className={styles.transactionField}><label htmlFor="confirmNewPin">Confirm new PIN</label><input id="confirmNewPin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={confirmPin} onChange={(event) => { setConfirmPin(event.target.value.replace(/\D/g, "")); setPinError(""); }} required /></div>
        {pinError && <p className={styles.goalError} role="alert">{pinError}</p>}
        <button className={styles.primaryAction} type="submit">Save new PIN</button>
      </form>}
      {notice && <p className={styles.goalNotice} role="status">{notice}</p>}

      <section className={`${styles.panel} ${styles.settingsAccountActions}`}>
        <h2>Account</h2>
        <p>Sign out on this device, or permanently delete your account and data.</p>
        <div className={styles.settingsActions}>
          <button className={styles.secondaryAction} type="button" onClick={logOut}>Log out</button>
          <button className={styles.dangerAction} type="button" onClick={() => setConfirmingDelete(true)}>Delete my account</button>
        </div>
      </section>
      {confirmingDelete && <GoalDialog title="Delete your account?" onClose={() => setConfirmingDelete(false)}>
        <p>This removes your wallet, records, and uploaded files. It cannot be undone.</p>
        <div className={styles.confirmActions}>
          <button className={styles.secondaryAction} type="button" disabled={deleting} onClick={() => setConfirmingDelete(false)}>Keep my account</button>
          <button className={styles.dangerAction} type="button" disabled={deleting} onClick={() => void deleteAccount()}>{deleting ? "Deleting…" : "Yes, delete everything"}</button>
        </div>
      </GoalDialog>}
    </DashboardFrame>
  );
}

export default function SettingsPage() {
  return <Suspense fallback={null}><SettingsContent /></Suspense>;
}
