"use client";

import { useEffect } from "react";

// Removes demo data left by the old browser-only app, including plain-text passwords and ID images.
export function BrowserDataCleanup() {
  useEffect(() => {
    try {
      for (const storage of [localStorage, sessionStorage]) {
        Object.keys(storage).filter((key) => key.startsWith("studentsave:")).forEach((key) => storage.removeItem(key));
      }
    } catch { /* Storage can be blocked. There is nothing to clean up then. */ }
  }, []);
  return null;
}
