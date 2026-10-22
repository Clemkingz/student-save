"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { if (error.digest) console.error("StudentSave app error", error.digest); }, [error.digest]);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, color: "#17231e", background: "#fbfcfa", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <main style={{ width: "min(100%, 440px)", padding: 32, border: "1px solid #e6ebe7", borderRadius: 22, background: "white", textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 25 }}>StudentSave needs a moment</h1>
          <p style={{ color: "#66736d", lineHeight: 1.65 }}>Something interrupted the app. Please try loading it again.</p>
          <button onClick={() => reset()} style={{ minHeight: 44, padding: "0 18px", border: 0, borderRadius: 11, color: "white", background: "#286a4b", font: "inherit", fontWeight: 650, cursor: "pointer" }}>Try again</button>
        </main>
      </body>
    </html>
  );
}
