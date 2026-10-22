"use client";

import { useEffect, useState } from "react";
import { readSchoolStatus, schoolStatusEvent, schoolStatusKey, schoolStatusLabels, type SchoolStatus } from "@repo/ui/lib/school-status";
import styles from "../dashboard.module.css";

export function SchoolStatusBar() {
  const [status, setStatus] = useState<SchoolStatus | null>(null);

  useEffect(() => {
    const refresh = () => {
      try { setStatus(readSchoolStatus(localStorage)); }
      catch { setStatus(null); }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === schoolStatusKey || event.key === null) refresh();
    };
    refresh();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(schoolStatusEvent, refresh);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(schoolStatusEvent, refresh);
    };
  }, []);

  return (
    <div className={`${styles.schoolStatusBar} ${status === null ? styles.schoolStatusUnset : status === "out-of-school" ? styles.schoolStatusOut : ""}`} role="status" aria-label="School status">
      {status && <span className={styles.schoolStatusDot} aria-hidden="true" />}
      <span>{status ? schoolStatusLabels[status] : "School status"}</span>
    </div>
  );
}
