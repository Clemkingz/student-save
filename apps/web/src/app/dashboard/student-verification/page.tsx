"use client";

import { Suspense, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardFrame } from "../_components/DashboardFrame";
import { useDashboardSession } from "../_components/useDashboardSession";
import styles from "../dashboard.module.css";

type StudentDetails = {
  institution: string;
  matricNumber: string;
  level: string;
  course: string;
  schoolIdImage: string;
  schoolIdFileName: string;
  status: "pending" | "submitted" | "verified";
  submittedAt: string;
};

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

function StudentVerificationContent() {
  const router = useRouter();
  const { email, ready } = useDashboardSession();
  const detailsKey = `studentsave:student-verification:${email}`;
  const photoKey = `studentsave:profile-picture:${email}`;
  const [institution, setInstitution] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [level, setLevel] = useState("");
  const [course, setCourse] = useState("");
  const [schoolIdImage, setSchoolIdImage] = useState("");
  const [schoolIdFileName, setSchoolIdFileName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [status, setStatus] = useState<StudentDetails["status"] | "not-submitted">("not-submitted");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!ready || !email) return;
    const refreshVerification = () => {
      try {
        const saved = localStorage.getItem(detailsKey);
        if (saved) {
          const details = JSON.parse(saved) as StudentDetails;
          setInstitution(details.institution || "");
          setMatricNumber(details.matricNumber || "");
          setLevel(details.level || "");
          setCourse(details.course || "");
          setSchoolIdImage(details.schoolIdImage || "");
          setSchoolIdFileName(details.schoolIdFileName || "");
          setStatus(details.status || "submitted");
        }
      } catch {
        localStorage.removeItem(detailsKey);
      }
    };
    refreshVerification();
    setProfilePhoto(localStorage.getItem(photoKey) || "");
    const handleStorage = (event: StorageEvent) => { if (event.key === detailsKey) refreshVerification(); };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [detailsKey, email, photoKey, ready]);

  useEffect(() => {
    if (ready && email && status === "verified") {
      router.replace(`/dashboard?email=${encodeURIComponent(email)}`);
    }
  }, [email, ready, router, status]);

  async function handleProfilePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      setError("Choose an image file smaller than 8 MB.");
      return;
    }
    try {
      const image = await compressImage(file, 640, 700_000);
      localStorage.setItem(photoKey, image);
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

  function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolIdImage) {
      setError("Upload a clear image of your school ID card.");
      setNotice("");
      return;
    }
    const details: StudentDetails = {
      institution: institution.trim(),
      matricNumber: matricNumber.trim(),
      level,
      course: course.trim(),
      schoolIdImage,
      schoolIdFileName,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(detailsKey, JSON.stringify(details));
      setStatus("pending");
      setError("");
      setNotice("Student details saved for mock verification.");
    } catch {
      setError("There isn’t enough browser storage for this image. Choose a smaller school ID image.");
      setNotice("");
    }
  }

  function removeProfilePhoto() {
    localStorage.removeItem(photoKey);
    setProfilePhoto("");
    window.dispatchEvent(new Event("studentsave:profile-picture-updated"));
    setNotice("Profile picture removed.");
  }

  function checkVerificationStatus() {
    try {
      const saved = localStorage.getItem(detailsKey);
      const details = saved ? JSON.parse(saved) as StudentDetails : null;
      if (details?.status === "verified") {
        setStatus("verified");
        setNotice("Your student verification is approved.");
        setError("");
      } else {
        setNotice("Your submission is still waiting for admin review.");
      }
    } catch {
      setNotice("Your verification submission could not be loaded.");
    }
  }

  if (!ready) return <main className={styles.mainContent} aria-live="polite">Loading student verification…</main>;

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

        {(status === "pending" || status === "submitted") && <div className={styles.verificationStatus} role="status"><div><strong>Verification pending</strong><span>Your details are waiting for review in the mock admin console.</span></div><button className={styles.recordProgressButton} type="button" onClick={checkVerificationStatus}>Check status</button></div>}
        {status === "verified" && <div className={styles.verificationApproved} role="status"><div><strong>Student verified</strong><span>Taking you to your dashboard…</span></div></div>}

        <form className={`${styles.panel} ${styles.studentVerificationForm}`} onSubmit={submitDetails}>
          <h2>Upload student details</h2>
          <div className={styles.studentVerificationFields}>
            <div className={styles.transactionField}><label htmlFor="institution">Name of institution</label><input id="institution" value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="e.g. University of Lagos" required /></div>
            <div className={styles.transactionField}><label htmlFor="matricNumber">Matriculation number</label><input id="matricNumber" value={matricNumber} onChange={(event) => setMatricNumber(event.target.value)} placeholder="Enter your matric number" required /></div>
            <div className={styles.transactionField}><label htmlFor="level">Level</label><select id="level" value={level} onChange={(event) => setLevel(event.target.value)} required><option value="" disabled>Select your level</option>{["100", "200", "300", "400", "500", "600", "700", "Postgraduate", "Other"].map((option) => <option key={option} value={option}>{option === "Postgraduate" || option === "Other" ? option : `${option} level`}</option>)}</select></div>
            <div className={styles.transactionField}><label htmlFor="course">Course of study</label><input id="course" value={course} onChange={(event) => setCourse(event.target.value)} placeholder="e.g. Computer Science" required /></div>
          </div>

          <div className={styles.schoolIdUpload}>
            <div><strong>School ID card</strong><p>Upload a clear photo or scan showing your name and institution. Image files up to 8 MB.</p></div>
            <label className={styles.schoolIdPicker} htmlFor="schoolIdCard">{schoolIdFileName ? "Replace student ID" : "Upload student ID"}</label>
            <input className={styles.visuallyHiddenInput} id="schoolIdCard" type="file" accept="image/*" onChange={handleSchoolId} />
            {schoolIdImage && <div className={styles.schoolIdPreview}><Image src={schoolIdImage} alt="Uploaded school ID card preview" width={900} height={600} unoptimized /><span>{schoolIdFileName || "School ID image"}</span></div>}
          </div>

          {error && <p className={styles.goalError} role="alert">{error}</p>}
          {notice && <p className={styles.goalNotice} role="status">{notice}</p>}
          <button className={styles.primaryAction} type="submit">Upload student details</button>
          <p className={styles.studentVerificationNote}>This is a mock verification form. Your details and image stay in this browser and are not sent to your school.</p>
        </form>
      </div>
      <div className={styles.verificationFooterLinks}>
        <Link className={styles.backLink} href={`/dashboard/settings?email=${encodeURIComponent(email)}`}>← Back to Account</Link>
        <Link className={styles.adminReviewLink} href="/admin/student-verifications" target="_blank" rel="noreferrer">Open mock admin review →</Link>
      </div>
    </DashboardFrame>
  );
}

export default function StudentVerificationPage() {
  return <Suspense fallback={null}><StudentVerificationContent /></Suspense>;
}
