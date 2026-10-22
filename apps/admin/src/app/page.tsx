import Link from "next/link";

export default function AdminHomePage() {
  return <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", padding: 20 }}><Link href="/student-verifications">Open student verification dashboard</Link></main>;
}
