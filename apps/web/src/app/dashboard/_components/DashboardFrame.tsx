"use client";

import Image from "next/image";
import Link from "next/link";
import { ChartNoAxesCombined, CircleDollarSign, FlaskConical, LayoutDashboard, LockKeyhole, ReceiptText, Settings2, Target, WalletCards } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@repo/supabase/browser";
import { SavingsAutomation } from "./SavingsAutomationNotice";
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
  simulator: FlaskConical,
};

const simulationMode = process.env.NEXT_PUBLIC_SIMULATION_MODE !== "false";

export function DashboardFrame({ email, active, children }: { email: string; active: "Dashboard" | "Add funds" | "Transactions" | "Budget/expenses" | "Savings Goals" | "Lock Savings" | "Reports & Alerts" | "Account" | "Student Verification" | "Simulator"; children: ReactNode }) {
  const [profilePicture, setProfilePicture] = useState("");
  const [needsStudentVerification, setNeedsStudentVerification] = useState(false);
  const dashboardHref = "/dashboard";
  const budgetsHref = "/dashboard/budgets";
  const goalsHref = "/dashboard/savings-goals";
  const lockSavingsHref = "/dashboard/lock-savings";
  const reportsHref = "/dashboard/reports";
  const settingsHref = "/dashboard/settings";
  const simulatorHref = "/dashboard/simulator";
  const sidebarItems = [
    { label: "Dashboard", href: dashboardHref, Icon: navIcons.dashboard },
    { label: "Budget/expenses", href: budgetsHref, Icon: navIcons.budget },
    { label: "Transactions", href: "/dashboard/transactions", Icon: navIcons.transactions },
    { label: "Savings Goals", href: goalsHref, Icon: navIcons.goals },
    { label: "Lock Savings", href: lockSavingsHref, Icon: navIcons.locks },
    { label: "Reports & Alerts", href: reportsHref, Icon: navIcons.reports },
    { label: "Account", href: settingsHref, Icon: navIcons.account },
    ...(simulationMode ? [{ label: "Simulator", href: simulatorHref, Icon: navIcons.simulator }] : []),
  ];
  const mobileItems = [
    { label: "Home", activeLabel: "Dashboard", href: dashboardHref, Icon: navIcons.dashboard },
    { label: "Budget", activeLabel: "Budget/expenses", href: budgetsHref, Icon: navIcons.budget },
    { label: "Spend", activeLabel: "Transactions", href: "/dashboard/transactions", Icon: navIcons.transactions },
    { label: "Goals", activeLabel: "Savings Goals", href: goalsHref, Icon: navIcons.goals },
    { label: "Locks", activeLabel: "Lock Savings", href: lockSavingsHref, Icon: navIcons.locks },
    { label: "Reports", activeLabel: "Reports & Alerts", href: reportsHref, Icon: navIcons.reports },
  ];

  useEffect(() => {
    if (!email) return;
    const supabase = createClient();
    const syncProfilePicture = async () => {
      const { data: profile } = await supabase.from("profiles").select("avatar_path").maybeSingle();
      if (!profile?.avatar_path) {
        setProfilePicture("");
        return;
      }
      const { data } = await supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 3600);
      setProfilePicture(data?.signedUrl ?? "");
    };
    void syncProfilePicture();
    void supabase.from("student_verifications").select("status").maybeSingle().then(({ data }) => setNeedsStudentVerification(data?.status !== "verified"));
    window.addEventListener("studentsave:profile-picture-updated", syncProfilePicture);
    return () => window.removeEventListener("studentsave:profile-picture-updated", syncProfilePicture);
  }, [email]);

  const profilePictureLink = (className: string | undefined) => (
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
        <div className={styles.mobileAccountControls}>{simulationMode && <Link className={styles.mobileSettingsLink} href={simulatorHref}>Simulator</Link>}<Link className={styles.mobileSettingsLink} href={settingsHref}>Account</Link>{active !== "Dashboard" && profilePictureLink(styles.mobileProfileAvatar)}</div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.dashboardTopBar}>{needsStudentVerification && <aside className={styles.verificationTopMessage} role="note"><strong>Verify your student status to unlock the dashboard</strong></aside>}{active !== "Dashboard" && profilePictureLink(styles.profileAvatar)}</div>
        {!needsStudentVerification && <SavingsAutomation email={email} />}
        {children}
      </main>

      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        {mobileItems.map(({ label, activeLabel, href, Icon }) => <Link className={active === activeLabel ? styles.mobileNavActive : styles.mobileNavLink} href={href} key={label}><span aria-hidden="true"><Icon size={19} strokeWidth={2} /></span>{label}</Link>)}
      </nav>
    </div>
  );
}
