import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="page-shell status-page">
      <section className="status-card">
        <span className="status-icon"><Compass size={25} /></span>
        <h1>We couldn’t find that page</h1>
        <p>The link may be out of date, or the page may have moved. Head back to the StudentSave home page to find your way.</p>
        <Link className="button" href="/">Back to home <ArrowIcon /></Link>
      </section>
    </main>
  );
}

function ArrowIcon() {
  return <span aria-hidden="true">→</span>;
}
