"use client";

import { useEffect, useState } from "react";
import { createClient } from "@repo/supabase/browser";
import { schoolStatusLabels, type SchoolStatus } from "@repo/ui/lib/school-status";
import styles from "../dashboard.module.css";

export function SchoolStatusBar() {
  const [status, setStatus] = useState<SchoolStatus | null>(null);

  useEffect(() => {
    void createClient().from("app_settings").select("school_status").maybeSingle().then(({ data }) => setStatus(data?.school_status ?? null));
  }, []);

  return (
    <div className={`${styles.schoolStatusBar} ${status === null ? styles.schoolStatusUnset : status === "out-of-school" ? styles.schoolStatusOut : ""}`} role="status" aria-label="School status">
      {status && <span className={styles.schoolStatusDot} aria-hidden="true" />}
      <span>{status ? schoolStatusLabels[status] : "School status"}</span>
    </div>
  );
}
