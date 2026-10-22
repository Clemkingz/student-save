import type { ReactNode } from "react";
import Image from "next/image";
import styles from "../auth.module.css";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className={styles.pageShell}>
      <aside className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <Image className={styles.lightLogo} src="/app/student-save-logo-light.svg" width={310} height={70} alt="StudentSave" />
          <h2>Know where your money goes.</h2>
          <ul className={styles.benefitList}>
            <li><span className={styles.bullet} aria-hidden="true">•</span><span>Record income and expenses in seconds</span></li>
            <li><span className={styles.bullet} aria-hidden="true">•</span><span>Plan budgets and savings goals</span></li>
            <li><span className={styles.bullet} aria-hidden="true">•</span><span>Build steady money habits</span></li>
          </ul>
        </div>
      </aside>
      <header className={styles.mobileHeader}>
        <Image className={styles.darkLogo} src="/app/student-save-logo-dark.svg" width={310} height={70} alt="StudentSave" />
      </header>
      <section className={styles.formPanel}>
        <div className={styles.formContent}>{children}</div>
      </section>
    </main>
  );
}
