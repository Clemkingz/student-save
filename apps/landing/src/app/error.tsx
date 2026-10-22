"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { if (error.digest) console.error("StudentSave landing error", error.digest); }, [error.digest]);

  return (
    <main className="status-page page-shell">
      <section className="status-card" role="alert">
        <span className="status-icon error-icon"><TriangleAlert size={25} aria-hidden="true" /></span>
        <h1>That didn’t go as planned</h1>
        <p>Something interrupted this page. Please try again, or return to the StudentSave home page.</p>
        <div className="hero-actions">
          <button className="button" onClick={() => reset()}>Try again</button>
          <Link className="button button-secondary" href="/">Go to home</Link>
        </div>
      </section>
    </main>
  );
}
