import Link from "next/link";

export default function FundRequestsPage() {
  return (
    <main style={{ maxWidth: 760, margin: "8vh auto", padding: 32, fontFamily: "system-ui, sans-serif" }}>
      <p>StudentSave Admin</p>
      <h1>Fund approval has been removed</h1>
      <p>Students now record manual fund additions on their own dashboard. The amount is added to their tracked balance immediately and a receipt is created.</p>
      <Link href="/student-verifications">Return to student verification</Link>
    </main>
  );
}
