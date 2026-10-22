"use client";

import Image from "next/image";
import Link from "next/link";
import { ChartNoAxesCombined, CircleDollarSign, LayoutDashboard, LockKeyhole, ReceiptText, Settings2, Target, WalletCards } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import styles from "../dashboard.module.css";

const navIcons = {
  dashboard: LayoutDashboard,
  transactions: ReceiptText,
  budget: WalletCards,
  goals: Target,
  locks: LockKeyhole,
  reports: ChartNoAxesCombined,
  account: Settings2,
  funds: CircleDollarSign,
};

export function DashboardFrame({ email, active, children }: { email: string; active: "Dashboard" | "Add funds" | "Transactions" | "Budget/expenses" | "Savings Goals" | "Lock Savings" | "Reports & Alerts" | "Account" | "Student Verification"; children: ReactNode }) {
  const [profilePicture, setProfilePicture] = useState("");
  const [needsStudentVerification, setNeedsStudentVerification] = useState(true);
  const dashboardHref = `/dashboard?email=${encodeURIComponent(email)}`;
  const budgetsHref = `/dashboard/budgets?email=${encodeURIComponent(email)}`;
  const goalsHref = `/dashboard/savings-goals?email=${encodeURIComponent(email)}`;
  const lockSavingsHref = `/dashboard/lock-savings?email=${encodeURIComponent(email)}`;
  const reportsHref = `/dashboard/reports?email=${encodeURIComponent(email)}`;
  const settingsHref = `/dashboard/settings?email=${encodeURIComponent(email)}`;
  const sidebarItems = [
    { label: "Dashboard", href: dashboardHref, Icon: navIcons.dashboard },
    { label: "Budget/expenses", href: budgetsHref, Icon: navIcons.budget },
    { label: "Transactions", href: `/dashboard/transactions?email=${encodeURIComponent(email)}`, Icon: navIcons.transactions },
    { label: "Savings Goals", href: goalsHref, Icon: navIcons.goals },
    { label: "Lock Savings", href: lockSavingsHref, Icon: navIcons.locks },
    { label: "Reports & Alerts", href: reportsHref, Icon: navIcons.reports },
    { label: "Account", href: settingsHref, Icon: navIcons.account },
  ];
  const mobileItems = [
    { label: "Home", activeLabel: "Dashboard", href: dashboardHref, Icon: navIcons.dashboard },
    { label: "Budget", activeLabel: "Budget/expenses", href: budgetsHref, Icon: navIcons.budget },
    { label: "Spend", activeLabel: "Transactions", href: `/dashboard/transactions?email=${encodeURIComponent(email)}`, Icon: navIcons.transactions },
    { label: "Goals", activeLabel: "Savings Goals", href: goalsHref, Icon: navIcons.goals },
    { label: "Locks", activeLabel: "Lock Savings", href: lockSavingsHref, Icon: navIcons.locks },
    { label: "Reports", activeLabel: "Reports & Alerts", href: reportsHref, Icon: navIcons.reports },
  ];

  useEffect(() => {
    if (!email) return;
    const syncProfilePicture = () => setProfilePicture(localStorage.getItem(`studentsave:profile-picture:${email}`) || "");
    syncProfilePicture();
    window.addEventListener("storage", syncProfilePicture);
    window.addEventListener("studentsave:profile-picture-updated", syncProfilePicture);
    return () => {
      window.removeEventListener("storage", syncProfilePicture);
      window.removeEventListener("studentsave:profile-picture-updated", syncProfilePicture);
    };
  }, [email]);

  useEffect(() => {
    if (!email) return;
    const syncVerification = () => {
      try {
        const saved = localStorage.getItem(`studentsave:student-verification:${email}`);
        const details = saved ? JSON.parse(saved) as { status?: string } : null;
        setNeedsStudentVerification(details?.status !== "verified");
      } catch {
        setNeedsStudentVerification(true);
      }
    };
    syncVerification();
    window.addEventListener("storage", syncVerification);
    return () => window.removeEventListener("storage", syncVerification);
  }, [email]);

  const profilePictureLink = (className: string) => (
    <Link className={className} href={settingsHref} aria-label="Open account">
      {profilePicture ? <Image src={profilePicture} alt="" width={44} height={44} unoptimized /> : <span>{email.slice(0, 1).toUpperCase() || "A"}</span>}
    </Link>
  );

  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href={dashboardHref}>
          <Image src="/student-save-logo-dark.svg" width={250} height={58} alt="StudentSave" priority />
        </Link>
        <nav aria-label="Main navigation" className={styles.desktopNav}>
          {sidebarItems.map(({ label, href, Icon }) => <Link className={active === label ? styles.navActive : styles.navLink} href={href} key={label}><span className={styles.navIcon} aria-hidden="true"><Icon size={18} strokeWidth={2} /></span>{label}</Link>)}
        </nav>
      </aside>

      <header className={styles.mobileHeader}>
        <Link className={styles.brand} href={dashboardHref}>
          <Image src="/student-save-logo-dark.svg" width={250} height={58} alt="StudentSave" priority />
        </Link>
        <div className={styles.mobileAccountControls}><Link className={styles.mobileSettingsLink} href={settingsHref}>Account</Link>{active !== "Dashboard" && profilePictureLink(styles.mobileProfileAvatar)}</div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.dashboardTopBar}><strong className={styles.sectionTitle}>{active}</strong>{needsStudentVerification && <aside className={styles.verificationTopMessage}><strong>Student verification needed to access dashboard</strong><Link href={`/dashboard/student-verification?email=${encodeURIComponent(email)}`}>Verify student account →</Link></aside>}{active !== "Dashboard" && profilePictureLink(styles.profileAvatar)}</div>
        {children}
      </main>

      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        {mobileItems.map(({ label, activeLabel, href, Icon }) => <Link className={active === activeLabel ? styles.mobileNavActive : styles.mobileNavLink} href={href} key={label}><span aria-hidden="true"><Icon size={19} strokeWidth={2} /></span>{label}</Link>)}
      </nav>
    </div>
  );
}
