"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { if (error.digest) console.error("StudentSave page error", error.digest); }, [error.digest]);

  return (
    <main className="page-shell status-page">
      <section className="status-card" role="alert">
        <span className="status-icon error-icon"><TriangleAlert size={25} /></span>
        <h1>That didn’t go as planned</h1>
        <p>Something interrupted this page. Please try again, or return home and continue from there.</p>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <button className="button" onClick={() => reset()}>Try again</button>
          <Link className="button button-secondary" href="/">Go to home</Link>
        </div>
      </section>
    </main>
  );
}
