"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardFrame } from "../_components/DashboardFrame";
import { useDashboardSession } from "../_components/useDashboardSession";
import { hashMockPassword } from "../../auth/_components/password";
import styles from "../dashboard.module.css";

type Notifications = { inApp: boolean; email: boolean; push: boolean };
const defaultNotifications: Notifications = { inApp: true, email: true, push: false };

function SettingsContent() {
  const router = useRouter();
  const { email, wallet, ready } = useDashboardSession();
  const profileKey = `studentsave:profile:${email}`;
  const notificationKey = `studentsave:notifications:${email}`;
  const passwordKey = `studentsave:password-change:${email}`;
  const [name, setName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [notice, setNotice] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!ready || !email) return;
    let pendingName = "";
    try {
      const pending = localStorage.getItem("studentsave:pending-signup");
      if (pending) {
        const parsed = JSON.parse(pending) as { email?: string; fullName?: string };
        if (parsed.email?.toLowerCase() === email) pendingName = parsed.fullName || "";
      }
    } catch {
      // Use the account name saved with this wallet as a fallback.
    }
    let savedName = "";
    try {
      const profile = localStorage.getItem(profileKey);
      if (profile) savedName = (JSON.parse(profile) as { name?: string }).name || "";
    } catch {
      localStorage.removeItem(profileKey);
    }
    setName(savedName || pendingName || wallet?.ownerName || email);
    try {
      const storedNotifications = localStorage.getItem(notificationKey);
      if (storedNotifications) setNotifications({ ...defaultNotifications, ...(JSON.parse(storedNotifications) as Partial<Notifications>) });
    } catch {
      localStorage.removeItem(notificationKey);
    }
    try {
      const verification = localStorage.getItem(`studentsave:email-verification:${email}`);
      setVerified(Boolean(verification && (JSON.parse(verification) as { verified?: boolean }).verified));
    } catch {
      setVerified(false);
    }
  }, [email, notificationKey, profileKey, ready, wallet]);

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = nameDraft.trim();
    if (!nextName) return;
    localStorage.setItem(profileKey, JSON.stringify({ name: nextName, updatedAt: new Date().toISOString() }));
    setName(nextName);
    setEditingProfile(false);
    setNotice("Profile updated in mock storage.");
  }

  function toggleNotification(key: keyof Notifications) {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    localStorage.setItem(notificationKey, JSON.stringify(next));
    setNotice("Notification preferences saved.");
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
    const credentialKey = `studentsave:password-hash:${email}`;
    const savedPasswordHash = localStorage.getItem(credentialKey);
    if (savedPasswordHash && await hashMockPassword(oldPassword) !== savedPasswordHash) {
      setPasswordError("Your current password is incorrect.");
      return;
    }
    localStorage.setItem(credentialKey, await hashMockPassword(newPassword));
    localStorage.setItem(passwordKey, JSON.stringify({ oldPassword, newPassword, changedAt: new Date().toISOString() }));
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setShowPasswordForm(false);
    setNotice("Password change saved to mock storage.");
  }

  function logOut() {
    localStorage.removeItem("studentsave:active-email");
    router.replace("/auth/sign-in");
  }

  function deleteAccount() {
    if (!window.confirm("Delete this mock account and its saved StudentSave data from this browser? This cannot be undone.")) return;
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter((key): key is string => Boolean(key));
    keys.filter((key) => key.includes(email)).forEach((key) => localStorage.removeItem(key));
    if (localStorage.getItem("studentsave:active-email")?.toLowerCase() === email) localStorage.removeItem("studentsave:active-email");
    try {
      const pending = localStorage.getItem("studentsave:pending-signup");
      if (pending && (JSON.parse(pending) as { email?: string }).email?.toLowerCase() === email) localStorage.removeItem("studentsave:pending-signup");
    } catch {
      localStorage.removeItem("studentsave:pending-signup");
    }
    router.replace("/auth/sign-up");
  }

  function exportData() {
    const keysToExport = [
      `studentsave:transactions:${email}`,
      `studentsave:fund-additions:${email}`,
      `studentsave:budgets:${email}`,
      `studentsave:savings-goals:${email}`,
      `studentsave:savings-contributions:${email}`,
      `studentsave:lock-commitments:${email}`,
      profileKey,
      notificationKey,
    ];
    const data = Object.fromEntries(keysToExport.flatMap((key) => {
      const value = localStorage.getItem(key);
      return value === null ? [] : [[key, JSON.parse(value) as unknown]];
    }));
    const blob = new Blob([JSON.stringify({ email, exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "studentsave-data.json";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Your mock data export has been downloaded.");
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
              <div className={styles.settingsRow}><div><strong>Email {verified ? "verified" : "not verified"}</strong><span>Confirms email ownership only</span></div><span className={verified ? styles.settingsVerified : styles.settingsStatus}>{verified ? "Verified" : "Pending"}</span></div>
              <div className={styles.settingsRow}><div><strong>Account currency</strong><span>{wallet?.currency === "NGN" || !wallet?.currency ? "Nigerian Naira (NGN ₦)" : wallet.currency}</span></div></div>
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <h2>Notifications</h2>
          <div className={styles.settingsRows}>
            <div className={styles.settingsRow}><div><strong>In-app</strong><span>Budget and goal alerts</span></div><button className={`${styles.settingsToggle} ${notifications.inApp ? styles.settingsToggleOn : ""}`} type="button" role="switch" aria-checked={notifications.inApp} aria-label="In-app notifications" onClick={() => toggleNotification("inApp")}><span /></button></div>
            <div className={styles.settingsRow}><div><strong>Email</strong><span>Selected reminders</span></div><button className={`${styles.settingsToggle} ${notifications.email ? styles.settingsToggleOn : ""}`} type="button" role="switch" aria-checked={notifications.email} aria-label="Email notifications" onClick={() => toggleNotification("email")}><span /></button></div>
            <div className={styles.settingsRow}><div><strong>Push</strong><span>Needs browser permission</span></div><button className={`${styles.settingsToggle} ${notifications.push ? styles.settingsToggleOn : ""}`} type="button" role="switch" aria-checked={notifications.push} aria-label="Push notifications" onClick={() => toggleNotification("push")}><span /></button></div>
          </div>
        </section>
      </div>

      <Link className={styles.studentVerificationLink} href={`/dashboard/student-verification?email=${encodeURIComponent(email)}`}>
        <span><strong>Student verification</strong><small>Upload your school ID and add your institution details.</small></span>
        <b aria-hidden="true">→</b>
      </Link>

      <p className={styles.disclaimer}>Push notifications also depend on your browser or device permission.</p>

      <div className={styles.settingsActions}>
        <button className={styles.secondaryAction} type="button" onClick={() => { setShowPasswordForm((value) => !value); setPasswordError(""); setNotice(""); }}>Change password</button>
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
      {notice && <p className={styles.goalNotice} role="status">{notice}</p>}

      <section className={`${styles.panel} ${styles.settingsAccountActions}`}>
        <h2>Account</h2>
        <p>Sign out on this device or remove this mock account and its saved data.</p>
        <div className={styles.settingsActions}>
          <button className={styles.secondaryAction} type="button" onClick={logOut}>Log out</button>
          <button className={styles.dangerAction} type="button" onClick={deleteAccount}>Delete my account</button>
        </div>
      </section>
    </DashboardFrame>
  );
}

export default function SettingsPage() {
  return <Suspense fallback={null}><SettingsContent /></Suspense>;
}
