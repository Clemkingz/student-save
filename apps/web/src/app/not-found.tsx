import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, LayoutDashboard, PiggyBank } from "lucide-react";

export const metadata = { title: "Page not found · StudentSave" };

export default function NotFound() {
  return (
    <main className="not-found-page">
      <Link href="/" aria-label="StudentSave home"><Image src="/student-save-logo.svg" width={180} height={45} alt="StudentSave" priority /></Link>
      <section className="not-found-card" aria-labelledby="not-found-title">
        <div className="not-found-visual" aria-hidden="true">
          <span className="not-found-digit">4</span>
          <span className="not-found-coin"><PiggyBank size={46} strokeWidth={1.8} /></span>
          <span className="not-found-digit">4</span>
        </div>
        <span className="not-found-kicker">Page not found</span>
        <h1 id="not-found-title">This page wandered off budget</h1>
        <p>The link may be out of date, or the page has moved. Your money and savings are safe. Pick up where you left off below.</p>
        <div className="not-found-actions">
          <Link className="not-found-primary" href="/dashboard"><LayoutDashboard size={18} aria-hidden="true" />Go to my dashboard</Link>
          <Link className="not-found-secondary" href="/"><ArrowLeft size={18} aria-hidden="true" />Back to home</Link>
        </div>
        <ul className="not-found-links" aria-label="Popular pages">
          <li><Link href="/dashboard/savings-goals">Savings goals</Link></li>
          <li><Link href="/dashboard/budgets">Budgets</Link></li>
          <li><Link href="/dashboard/reports">Reports</Link></li>
          <li><Link href="/auth/sign-in">Sign in</Link></li>
        </ul>
      </section>
    </main>
  );
}
