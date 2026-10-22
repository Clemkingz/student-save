"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type StudentDetails = {
  institution: string;
  matricNumber: string;
  level: string;
  course: string;
  schoolIdImage: string;
  schoolIdFileName: string;
  status: "pending" | "submitted" | "verified";
  submittedAt: string;
  verifiedAt?: string;
};
type ReviewRecord = StudentDetails & { email: string };
type Filter = "all" | "pending" | "verified";
const storagePrefix = "studentsave:student-verification:";

function loadRecords() {
  const records: ReviewRecord[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(storagePrefix)) continue;
    const email = key.slice(storagePrefix.length);
    const saved = localStorage.getItem(key);
    if (!saved) continue;
    try {
      const record = JSON.parse(saved) as StudentDetails;
      if (record.institution && record.matricNumber && record.schoolIdImage) records.push({ ...record, email });
    } catch {
      // Skip invalid local mock records.
    }
  }
  return records.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export default function StudentVerificationsPage() {
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  const refreshRecords = useCallback(() => {
    setRecords(loadRecords());
  }, []);

  useEffect(() => {
    refreshRecords();
    window.addEventListener("storage", refreshRecords);
    return () => window.removeEventListener("storage", refreshRecords);
  }, [refreshRecords]);

  const pendingCount = records.filter((record) => record.status !== "verified").length;
  const verifiedCount = records.filter((record) => record.status === "verified").length;
  const visibleRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesFilter = filter === "all" || (filter === "verified" ? record.status === "verified" : record.status !== "verified");
      const matchesQuery = !normalizedQuery || [record.email, record.institution, record.matricNumber, record.course].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, records]);

  function verifyStudent(email: string) {
    const key = `${storagePrefix}${email}`;
    const saved = localStorage.getItem(key);
    if (!saved) return;
    try {
      const updated = { ...(JSON.parse(saved) as StudentDetails), status: "verified" as const, verifiedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(updated));
      refreshRecords();
      setNotice(`${email} is verified. Their StudentSave features are now unlocked.`);
    } catch {
      setNotice(`Could not update the verification record for ${email}.`);
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/student-verifications"><span className="admin-brand-mark">S</span>StudentSave Admin</Link>
        <nav className="admin-nav" aria-label="Admin navigation"><Link href="/student-verifications" aria-current="page">▣ <span>Student verification</span></Link></nav>
        <p className="admin-sidebar-note">Mock review mode. Approvals are saved in this browser for testing.</p>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar"><span className="admin-topbar-label">ADMIN WORKSPACE / STUDENTS</span><Link href="/">Exit admin dashboard</Link></div>
        <header className="admin-heading">
          <div><span className="admin-eyebrow">Verification queue</span><h1>Student verification</h1><p>Review submitted school details and approve student accounts.</p></div>
          <button className="admin-refresh" type="button" onClick={refreshRecords}>Refresh submissions</button>
        </header>

        <section className="admin-stats" aria-label="Verification totals">
          <article className="admin-stat admin-stat-highlight"><span>Awaiting review</span><strong>{pendingCount}</strong></article>
          <article className="admin-stat"><span>Verified students</span><strong>{verifiedCount}</strong></article>
          <article className="admin-stat"><span>Total submissions</span><strong>{records.length}</strong></article>
        </section>

        <div className="admin-toolbar">
          <input className="admin-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, institution, matric number" aria-label="Search student submissions" />
          <div className="admin-filters" role="group" aria-label="Filter submissions">
            {(["all", "pending", "verified"] as const).map((item) => <button key={item} className={`admin-filter ${filter === item ? "admin-filter-active" : ""}`} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>{item === "all" ? "All" : item === "pending" ? "Awaiting review" : "Verified"}</button>)}
          </div>
        </div>

        {notice && <p className="admin-notice" role="status">{notice}</p>}
        <section className="admin-review-list" aria-label="Student submissions">
          {visibleRecords.length ? visibleRecords.map((record) => (
            <article className="admin-review-card" key={record.email}>
              <div className="student-info">
                <div className="student-info-top"><span className={`status-pill ${record.status === "verified" ? "status-pill-verified" : ""}`}>{record.status === "verified" ? "Verified" : "Awaiting review"}</span><span className="admin-topbar-label">{new Date(record.submittedAt).toLocaleDateString("en-GB")}</span></div>
                <h2>{record.institution}</h2>
                <p className="student-email">{record.email}</p>
                <dl className="student-fields">
                  <div><dt>Matriculation number</dt><dd>{record.matricNumber}</dd></div>
                  <div><dt>Level</dt><dd>{record.level}</dd></div>
                  <div><dt>Course of study</dt><dd>{record.course}</dd></div>
                </dl>
                {record.status !== "verified" ? <button className="verify-action" type="button" onClick={() => verifyStudent(record.email)}>Verify student</button> : <p className="verified-date">Verified {record.verifiedAt ? new Date(record.verifiedAt).toLocaleDateString("en-GB") : ""}</p>}
                <a className="student-page-link" href={`/dashboard/student-verification?email=${encodeURIComponent(record.email)}`}>Open student page</a>
              </div>
              <div className="id-preview"><Image src={record.schoolIdImage} alt={`School ID card for ${record.email}`} width={960} height={640} unoptimized /><span>{record.schoolIdFileName || "Uploaded school ID card"}</span></div>
            </article>
          )) : <div className="empty-state">No matching submissions. Student records saved from this browser will appear here.</div>}
        </section>
      </main>
    </div>
  );
}
