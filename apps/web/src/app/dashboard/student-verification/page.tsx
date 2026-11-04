"use client";

import { Suspense, useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@repo/supabase/browser";
import { DashboardFrame } from "../_components/DashboardFrame";
import { useDashboardSession } from "../_components/useDashboardSession";
import { UniversitySelect } from "../_components/UniversitySelect";
import styles from "../dashboard.module.css";
import { PageLoader } from "../../PageLoader";

type VerificationStatus = "pending" | "verified" | "rejected" | "not-submitted";

function compressImage(file: File, maxDimension: number, maxDataUrlLength: number) {
  return createImageBitmap(file).then((bitmap) => {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This image could not be processed. Try another image.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    for (const quality of [0.86, 0.76, 0.66, 0.56, 0.46]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= maxDataUrlLength) return dataUrl;
    }
    throw new Error("This image is too large to save. Choose a smaller or clearer crop.");
  });
}

function dataUrlToBlob(dataUrl: string) {
  return fetch(dataUrl).then((response) => response.blob());
}

function StudentVerificationContent() {
  const { userId, email, ready } = useDashboardSession();
  const [institution, setInstitution] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [level, setLevel] = useState("");
  const [course, setCourse] = useState("");
  const [schoolIdImage, setSchoolIdImage] = useState("");
  const [schoolIdFileName, setSchoolIdFileName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [schoolIdPath, setSchoolIdPath] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<VerificationStatus>("not-submitted");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState("");

  const refreshVerification = useCallback(async () => {
    const supabase = createClient();
    const { data: details } = await supabase.from("student_verifications").select("*").maybeSingle();
    if (!details) return null;
    setInstitution(details.institution);
    setMatricNumber(details.matric_number);
    setLevel(details.level);
    setCourse(details.course);
    setSchoolIdPath(details.school_id_path);
    setSchoolIdFileName(details.school_id_file_name);
    setRejectionReason(details.rejection_reason ?? "");
    setStatus(details.status);
    const { data: image } = await supabase.storage.from("school-ids").createSignedUrl(details.school_id_path, 300);
    setSchoolIdImage(image?.signedUrl ?? "");
    return details.status;
  }, []);

  const refreshProfilePhoto = useCallback(async () => {
    const supabase = createClient();
    const { data: profile } = await supabase.from("profiles").select("avatar_path").maybeSingle();
    if (!profile?.avatar_path) {
      setProfilePhoto("");
      return;
    }
    const { data } = await supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 3600);
    setProfilePhoto(data?.signedUrl ?? "");
  }, []);

  useEffect(() => {
    if (!ready || !email) return;
    void refreshVerification();
    void refreshProfilePhoto();
  }, [email, ready, refreshProfilePhoto, refreshVerification]);

  useEffect(() => {
    if (status !== "pending") return;
    const check = () => void refreshVerification();
    const interval = window.setInterval(check, 5000);
    // Browsers slow timers in background tabs, so check again on return.
    window.addEventListener("focus", check);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
    };
  }, [refreshVerification, status]);

  useEffect(() => {
    if (ready && email && status === "verified") {
      window.location.assign("/dashboard");
    }
  }, [email, ready, status]);

  async function handleProfilePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      setError("Choose an image file smaller than 8 MB.");
      return;
    }
    try {
      const image = await compressImage(file, 640, 700_000);
      const supabase = createClient();
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, await dataUrlToBlob(image), { contentType: "image/jpeg" });
      if (uploadError) throw new Error("This image could not be saved. Try a smaller image.");
      const { error: saveError } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", userId);
      if (saveError) throw new Error("This image could not be saved. Try again.");
      setProfilePhoto(image);
      window.dispatchEvent(new Event("studentsave:profile-picture-updated"));
      setError("");
      setNotice("Profile picture updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This image could not be saved.");
    }
    event.target.value = "";
  }

  async function handleSchoolId(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      setError("Choose an image of your school ID smaller than 8 MB.");
      return;
    }
    try {
      const image = await compressImage(file, 1800, 1_500_000);
      setSchoolIdImage(image);
      setSchoolIdFileName(file.name);
      setError("");
      setNotice("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This school ID image could not be processed.");
    }
    event.target.value = "";
  }

  async function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!institution.trim()) { setError("Choose your university or enter your institution using Other."); return; }
    if (!schoolIdImage) {
      setError("Upload a clear image of your school ID card.");
      setNotice("");
      return;
    }
    setSubmitting(true);
    setNotice("");
    try {
      const supabase = createClient();
      // This page can be open from before an approval. Check first, so nothing is uploaded for nothing.
      const { data: current } = await supabase.from("student_verifications").select("status").maybeSingle();
      if (current?.status === "verified") {
        setStatus("verified");
        return;
      }
      let path = schoolIdPath;
      if (schoolIdImage.startsWith("data:")) {
        path = `${userId}/school-id-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("school-ids").upload(path, await dataUrlToBlob(schoolIdImage), { contentType: "image/jpeg" });
        if (uploadError) {
          setError("Your school ID image could not be uploaded. Check your connection and try again.");
          return;
        }
      }
      const { data, error: submitError } = await supabase.rpc("submit_student_verification", {
        p_institution: institution.trim(),
        p_matric_number: matricNumber.trim(),
        p_level: level,
        p_course: course.trim(),
        p_school_id_path: path,
        p_school_id_file_name: schoolIdFileName,
      });
      const code = (data as { code?: string } | null)?.code;
      if (code === "already_verified") {
        setStatus("verified");
        return;
      }
      if (submitError || code) {
        setError(code === "missing_details" ? "Fill in your institution, matric number, level, and course." : code === "invalid_school_id" ? "Upload your school ID image again." : "We couldn’t submit your details. Check your connection and try again.");
        return;
      }
      setSchoolIdPath(path);
      setRejectionReason("");
      setStatus("pending");
      setError("");
      setNotice("Student details submitted for review.");
    } catch {
      setError("We couldn’t submit your details. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeProfilePhoto() {
    const { error: removeError } = await createClient().from("profiles").update({ avatar_path: null }).eq("id", userId);
    if (removeError) {
      setError("This picture could not be removed. Try again.");
      return;
    }
    setProfilePhoto("");
    window.dispatchEvent(new Event("studentsave:profile-picture-updated"));
    setNotice("Profile picture removed.");
  }

  async function checkVerificationStatus() {
    if (checking) return;
    setChecking(true);
    setCheckResult("");
    setError("");
    setNotice("");
    const latest = await refreshVerification();
    setChecking(false);
    setCheckResult(latest === "pending" ? `Still waiting for admin review. Checked at ${new Date().toLocaleTimeString("en-NG", { timeStyle: "short" })}.` : latest ? "" : "We couldn’t check your status. Reload this page and try again.");
  }

  if (!ready) return <PageLoader message="Loading student verification…" />;

  return (
    <DashboardFrame email={email} active="Student Verification">
      <header className={styles.pageHeading}>
        <h1>Student verification</h1>
        <p>Add your student details and upload your school ID card.</p>
      </header>

      <div className={styles.verificationLayout}>
        <section className={`${styles.panel} ${styles.profilePhotoPanel}`}>
          <div className={styles.profilePhotoPreview}>
            {profilePhoto ? <Image src={profilePhoto} alt="Your profile picture" width={112} height={112} unoptimized /> : <span aria-hidden="true">{email.slice(0, 1).toUpperCase()}</span>}
          </div>
          <div className={styles.profilePhotoCopy}>
            <h2>Profile picture</h2>
            <p>Add a photo or choose a new one to update your profile.</p>
            <div className={styles.profilePhotoActions}>
              <label className={styles.secondaryAction} htmlFor="profilePhoto">{profilePhoto ? "Update picture" : "Add picture"}</label>
              {profilePhoto && <button className={styles.recordProgressButton} type="button" onClick={removeProfilePhoto}>Remove</button>}
            </div>
            <input className={styles.visuallyHiddenInput} id="profilePhoto" type="file" accept="image/*" onChange={handleProfilePhoto} />
          </div>
        </section>

        {status === "pending" && <div className={styles.verificationStatus} role="status"><div><strong>Verification pending</strong><span>{checkResult || "Your details are waiting for admin review. This page updates by itself."}</span></div><button className={`${styles.recordProgressButton} ${styles.checkStatusButton}`} type="button" disabled={checking} aria-busy={checking} onClick={() => void checkVerificationStatus()}>{checking ? "Checking…" : "Check status"}</button></div>}
        {status === "rejected" && <div className={styles.verificationStatus} role="alert"><div><strong>Verification rejected</strong><span>{rejectionReason} Update your details and submit again.</span></div></div>}
        {status === "verified" && <div className={styles.verificationApproved} role="status"><div><strong>Student verified</strong><span>Taking you to your dashboard…</span></div></div>}

        <form className={`${styles.panel} ${styles.studentVerificationForm}`} onSubmit={submitDetails}>
          <h2>Upload student details</h2>
          <div className={styles.studentVerificationFields}>
            <UniversitySelect key={ready ? "ready" : "loading"} value={institution} onChange={setInstitution} />
            <div className={styles.transactionField}><label htmlFor="matricNumber">Matriculation number</label><input id="matricNumber" value={matricNumber} onChange={(event) => setMatricNumber(event.target.value)} placeholder="Enter your matric number" required /></div>
            <div className={styles.transactionField}><label htmlFor="level">Level</label><select id="level" value={level} onChange={(event) => setLevel(event.target.value)} required><option value="" disabled>Select your level</option>{["100", "200", "300", "400", "500", "600", "700", "Postgraduate", "Other"].map((option) => <option key={option} value={option}>{option === "Postgraduate" || option === "Other" ? option : `${option} level`}</option>)}</select></div>
            <div className={styles.transactionField}><label htmlFor="course">Course of study</label><input id="course" value={course} onChange={(event) => setCourse(event.target.value)} placeholder="e.g. Computer Science" required /></div>
          </div>

          <div className={styles.schoolIdUpload}>
            <div><strong>School ID card</strong><p>Upload a clear photo or scan showing your name and institution. Test mode: use a sample image, not a real ID.</p></div>
            <label className={styles.schoolIdPicker} htmlFor="schoolIdCard">{schoolIdFileName ? "Replace student ID" : "Upload student ID"}</label>
            <input className={styles.visuallyHiddenInput} id="schoolIdCard" type="file" accept="image/*" onChange={handleSchoolId} />
            {schoolIdImage && <div className={styles.schoolIdPreview}><Image src={schoolIdImage} alt="Uploaded school ID card preview" width={900} height={600} unoptimized /><span>{schoolIdFileName || "School ID image"}</span></div>}
          </div>

          {error && <p className={styles.goalError} role="alert">{error}</p>}
          {notice && <p className={styles.goalNotice} role="status">{notice}</p>}
          <button className={styles.primaryAction} type="submit" disabled={submitting} aria-busy={submitting}>Upload student details</button>
          <p className={styles.studentVerificationNote}>Test mode: use made-up details. Nothing is sent to your school.</p>
        </form>
      </div>
      <div className={styles.verificationFooterLinks}>
        <Link className={styles.backLink} href="/dashboard/settings">← Back to Account</Link>
      </div>
    </DashboardFrame>
  );
}

export default function StudentVerificationPage() {
  return <Suspense fallback={null}><StudentVerificationContent /></Suspense>;
}
