"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { createAdminClient as createClient } from "@repo/supabase/browser";
import { schoolStatusLabels, type SchoolStatus } from "@repo/ui/lib/school-status";

type ReviewRecord = {
  user_id: string;
  email: string;
  institution: string;
  matric_number: string;
  level: string;
  course: string;
  school_id_path: string;
  school_id_file_name: string;
  status: "pending" | "verified" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  school_id_url?: string;
};
type Filter = "all" | "pending" | "verified" | "rejected";
const filterLabels: Record<Filter, string> = { all: "All", pending: "Awaiting review", verified: "Verified", rejected: "Rejected" };
const rejectionReasons = ["The ID image is unclear", "The details don’t match the ID", "This is not a valid school ID"];
const iconPaths = {
  check: "M20 6 9 17l-5-5",
  close: "M18 6 6 18M6 6l12 12",
  refresh: "M21 12a9 9 0 1 1-2.6-6.4L21 8m0-5v5h-5",
  search: "m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  expand: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7",
};

function Icon({ name, size = 16 }: { name: keyof typeof iconPaths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[name]} /></svg>;
}

function AdminDialog({ title, wide = false, onClose, children }: { title: string; wide?: boolean; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog ref={dialog} className={`admin-dialog ${wide ? "admin-dialog-wide" : ""}`} aria-labelledby={titleId} onCancel={onClose} onClick={(event) => { if (event.target === dialog.current) onClose(); }}>
      <div className="admin-dialog-body">
        <h2 id={titleId}>{title}</h2>
        <button className="admin-dialog-close" type="button" aria-label="Close dialog" onClick={onClose}><Icon name="close" size={18} /></button>
        {children}
      </div>
    </dialog>
  );
}

const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://student-saveus.vercel.app")).replace(/\/$/, "");

export function StudentVerificationReview({ reviewPath = "/student-verifications", studentOrigin = appOrigin }: { reviewPath?: string; studentOrigin?: string }) {
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [busy, setBusy] = useState("");
  const [rejecting, setRejecting] = useState<ReviewRecord | null>(null);
  const [reason, setReason] = useState("");
  const [viewing, setViewing] = useState<ReviewRecord | null>(null);
  const [schoolStatus, setSchoolStatus] = useState<SchoolStatus | null>(null);
  const [schoolStatusReady, setSchoolStatusReady] = useState(false);
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">("checking");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const showNotice = useCallback((text: string, tone: "success" | "error" = "error") => setNotice({ text, tone }), []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const refreshRecords = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("admin_list_verifications");
    const result = data as { ok?: boolean; records?: ReviewRecord[] } | null;
    if (error || !result?.ok) {
      setAccess("denied");
      return;
    }
    setAccess("allowed");
    const list = result.records ?? [];
    const { data: urls } = list.length ? await supabase.storage.from("school-ids").createSignedUrls(list.map((record) => record.school_id_path), 300) : { data: [] };
    setRecords(list.map((record, index) => ({ ...record, school_id_url: urls?.[index]?.signedUrl ?? undefined })));
  }, []);

  useEffect(() => {
    void refreshRecords();
    void createClient().from("app_settings").select("school_status").maybeSingle().then(({ data, error }) => {
      if (error) {
        showNotice("School status could not be loaded. Reload this page.");
        return;
      }
      setSchoolStatus(data?.school_status ?? null);
      setSchoolStatusReady(true);
    });
  }, [refreshRecords, showNotice]);

  async function updateSchoolStatus(status: SchoolStatus) {
    const { data, error } = await createClient().rpc("set_school_status", { p_status: status });
    if (error || !(data as { ok?: boolean } | null)?.ok) {
      showNotice("School status could not be saved. Try again.");
      return;
    }
    setSchoolStatus(status);
    showNotice(`School status updated to ${schoolStatusLabels[status].toLowerCase()}.`, "success");
  }

  const pendingCount = records.filter((record) => record.status === "pending").length;
  const verifiedCount = records.filter((record) => record.status === "verified").length;
  const rejectedCount = records.filter((record) => record.status === "rejected").length;
  const filterCounts: Record<Filter, number> = { all: records.length, pending: pendingCount, verified: verifiedCount, rejected: rejectedCount };
  const visibleRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesFilter = filter === "all" || record.status === filter;
      const matchesQuery = !normalizedQuery || [record.email, record.institution, record.matric_number, record.course].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, records]);

  async function reviewStudent(record: ReviewRecord, approve: boolean, rejectionReason = "") {
    if (busy) return;
    setBusy(record.user_id);
    const { data, error } = await createClient().rpc("review_student_verification", { p_user: record.user_id, p_approve: approve, p_reason: rejectionReason });
    if (error || !(data as { ok?: boolean } | null)?.ok) {
      setBusy("");
      showNotice(`Could not update the verification record for ${record.email}. Refresh the queue and try again.`);
      return;
    }
    await refreshRecords();
    setBusy("");
    setRejecting(null);
    setReason("");
    showNotice(approve ? `${record.email} is verified. Their StudentSave features are now unlocked.` : `${record.email} was rejected.`, "success");
  }

  async function refreshQueue() {
    setBusy("refresh");
    await refreshRecords();
    setBusy("");
    showNotice("The queue is up to date.", "success");
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      showNotice("Use at least 8 characters for your new password.");
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error: currentError } = await supabase.auth.signInWithPassword({ email: user?.email ?? "", password: currentPassword });
    if (currentError) {
      showNotice("Your current password is incorrect.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      showNotice("Your password could not be changed. Try a different one.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setShowPasswordForm(false);
    showNotice("Password changed.", "success");
  }

  async function switchAccount() {
    await createClient().auth.signOut({ scope: "local" });
    window.location.assign(`${studentOrigin}/admin/sign-in`);
  }

  if (access !== "allowed") {
    return (
      <main className="admin-gate">
        <div className="admin-gate-card">
          {access === "checking" && <span className="admin-spinner" aria-hidden="true" />}
          <p role="status">{access === "checking" ? "Checking access…" : "This page is for StudentSave admins. This account is not an admin."}</p>
          {access === "denied" && <button className="verify-action" type="button" onClick={() => void switchAccount()}>Sign in as admin</button>}
        </div>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href={reviewPath}><span className="admin-brand-mark">S</span>StudentSave Admin</Link>
        <nav className="admin-nav" aria-label="Admin navigation"><Link href={reviewPath} aria-current="page"><Icon name="check" /><span>Student verification</span></Link></nav>
        <p className="admin-sidebar-note">Test mode. Students use sample IDs and simulated money.</p>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <span className="admin-topbar-label">Admin workspace / Students</span>
          <div className="admin-topbar-actions">
            <a className="admin-refresh" href={`${studentOrigin}/`}>Exit admin dashboard</a>
            <button className="admin-refresh" type="button" onClick={() => setShowPasswordForm(true)}>Change password</button>
            <button className="admin-refresh" type="button" onClick={() => void switchAccount()}>Log out</button>
          </div>
        </div>
        <header className="admin-heading">
          <div><span className="admin-eyebrow">Verification queue</span><h1>Student verification</h1><p>Review submitted school details and approve student accounts.</p></div>
          <button className="admin-refresh admin-refresh-icon" type="button" disabled={busy === "refresh"} onClick={() => void refreshQueue()}><Icon name="refresh" />{busy === "refresh" ? "Refreshing…" : "Refresh submissions"}</button>
        </header>

        <section className="admin-stats" aria-label="Verification totals">
          <article className="admin-stat admin-stat-highlight"><span>Awaiting review</span><strong>{pendingCount}</strong></article>
          <article className="admin-stat"><span>Verified students</span><strong>{verifiedCount}</strong></article>
          <article className="admin-stat"><span>Rejected</span><strong>{rejectedCount}</strong></article>
          <article className="admin-stat"><span>Total submissions</span><strong>{records.length}</strong></article>
        </section>

        <section className="admin-school-status" aria-labelledby="school-status-heading">
          <div><h2 id="school-status-heading">School status</h2><p>Set the status shown on all student dashboards.</p></div>
          <div className="school-status-options" role="group" aria-label="School status">
            {(["in-school", "out-of-school"] as const).map((status) => <button key={status} type="button" className="school-status-option" aria-pressed={schoolStatusReady && schoolStatus === status} disabled={!schoolStatusReady} onClick={() => void updateSchoolStatus(status)}><span className={`school-status-dot ${status === "out-of-school" ? "school-status-dot-out" : ""}`} aria-hidden="true" />{schoolStatusLabels[status]}</button>)}
          </div>
        </section>

        <div className="admin-toolbar">
          <label className="admin-search-field"><Icon name="search" /><input className="admin-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search email, institution, matric number or course" aria-label="Search student submissions" /></label>
          <div className="admin-filters" role="group" aria-label="Filter submissions">
            {(["all", "pending", "verified", "rejected"] as const).map((item) => <button key={item} className={`admin-filter ${filter === item ? "admin-filter-active" : ""}`} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>{filterLabels[item]} <span>{filterCounts[item]}</span></button>)}
          </div>
        </div>

        <section className="admin-review-list" aria-label="Student submissions">
          {visibleRecords.length ? visibleRecords.map((record) => (
            <article className="admin-review-card" key={record.user_id}>
              <div className="student-info">
                <div className="student-info-top"><span className={`status-pill status-pill-${record.status}`}>{filterLabels[record.status]}</span><span className="admin-topbar-label">{new Date(record.submitted_at).toLocaleDateString("en-GB")}</span></div>
                <div className="student-identity">
                  <span className="student-avatar" aria-hidden="true">{record.email.slice(0, 1).toUpperCase()}</span>
                  <div><h2>{record.institution}</h2><p className="student-email">{record.email}</p></div>
                </div>
                <dl className="student-fields">
                  <div><dt>Matriculation number</dt><dd>{record.matric_number}</dd></div>
                  <div><dt>Level</dt><dd>{record.level}</dd></div>
                  <div><dt>Course of study</dt><dd>{record.course}</dd></div>
                </dl>
                {record.status === "pending" && <div className="student-actions">
                  <button className="verify-action" type="button" disabled={Boolean(busy)} onClick={() => void reviewStudent(record, true)}><Icon name="check" />{busy === record.user_id ? "Verifying…" : "Verify student"}</button>
                  <button className="admin-reject" type="button" disabled={Boolean(busy)} onClick={() => { setReason(""); setRejecting(record); }}><Icon name="close" />Reject</button>
                </div>}
                {record.status === "verified" && <p className="verified-date">Verified {record.reviewed_at ? new Date(record.reviewed_at).toLocaleDateString("en-GB") : ""}</p>}
                {record.status === "rejected" && <p className="rejected-reason"><strong>Rejected:</strong> {record.rejection_reason}</p>}
              </div>
              <div className="id-preview">
                {record.school_id_url
                  ? <button type="button" aria-label={`View school ID for ${record.email}`} onClick={() => setViewing(record)}><Image src={record.school_id_url} alt={`School ID card for ${record.email}`} width={960} height={640} unoptimized /><i><Icon name="expand" /></i></button>
                  : <div className="id-missing">Image unavailable</div>}
                <span>{record.school_id_file_name || "Uploaded school ID card"}</span>
              </div>
            </article>
          )) : <div className="empty-state"><strong>No matching submissions</strong><br />Try a different search or filter.</div>}
        </section>
      </main>

      {showPasswordForm && <AdminDialog title="Change password" onClose={() => setShowPasswordForm(false)}>
        <form className="admin-dialog-form" onSubmit={changePassword}>
          <label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
          <label>New password<input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
          <button className="verify-action" type="submit">Save new password</button>
        </form>
      </AdminDialog>}

      {rejecting && <AdminDialog title="Reject this submission?" onClose={() => setRejecting(null)}>
        <form className="admin-dialog-form" onSubmit={(event) => { event.preventDefault(); void reviewStudent(rejecting, false, reason.trim()); }}>
          <p>{rejecting.email} will see this reason and can submit again.</p>
          <div className="admin-reason-options">{rejectionReasons.map((item) => <button key={item} type="button" aria-pressed={reason === item} onClick={() => setReason(item)}>{item}</button>)}</div>
          <label>Reason<textarea rows={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
          <div className="admin-dialog-actions">
            <button className="admin-refresh" type="button" onClick={() => setRejecting(null)}>Cancel</button>
            <button className="admin-danger" type="submit" disabled={!reason.trim() || Boolean(busy)}>{busy ? "Rejecting…" : "Reject submission"}</button>
          </div>
        </form>
      </AdminDialog>}

      {viewing?.school_id_url && <AdminDialog title={viewing.email} wide onClose={() => setViewing(null)}>
        <Image className="admin-id-full" src={viewing.school_id_url} alt={`School ID card for ${viewing.email}`} width={1400} height={930} unoptimized />
      </AdminDialog>}

      {notice && <div className="admin-toast" data-tone={notice.tone} role="status" key={notice.text}>
        <span><Icon name={notice.tone === "success" ? "check" : "close"} /></span>
        <strong>{notice.text}</strong>
        <button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}><Icon name="close" /></button>
      </div>}
    </div>
  );
}
