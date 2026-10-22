import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="status-page page-shell">
      <section className="status-card">
        <span className="status-icon"><Compass size={25} aria-hidden="true" /></span>
        <h1>We couldn’t find that page</h1>
        <p>The link may be out of date, or the page may have moved. Head back to the StudentSave home page to find your way.</p>
        <Link className="button" href="/">Back to home <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
