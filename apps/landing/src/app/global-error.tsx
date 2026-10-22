"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { if (error.digest) console.error("StudentSave landing app error", error.digest); }, [error.digest]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, color: "#131927", background: "#f8fbf9", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <main style={{ width: "min(100%, 440px)", padding: 32, border: "1px solid #dfe9e3", borderRadius: 22, background: "white", textAlign: "center" }}>
          <h1 style={{ margin: 0, color: "#0d6f69", fontSize: 25 }}>StudentSave needs a moment</h1>
          <p style={{ color: "#404946", lineHeight: 1.65 }}>Something interrupted this page. Please try loading the site again.</p>
          <button onClick={() => reset()} style={{ minHeight: 44, padding: "0 18px", border: 0, borderRadius: 11, color: "white", background: "#137d75", font: "inherit", fontWeight: 650, cursor: "pointer" }}>Try again</button>
        </main>
      </body>
    </html>
  );
}
