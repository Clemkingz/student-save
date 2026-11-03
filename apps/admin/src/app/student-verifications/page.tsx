import { redirect } from "next/navigation";

const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://student-saveus.vercel.app")).replace(/\/$/, "");

// Sign-in and sessions live on the student app, so the review queue does too.
export default function StudentVerificationsPage() {
  redirect(`${appOrigin}/admin/student-verifications`);
}
