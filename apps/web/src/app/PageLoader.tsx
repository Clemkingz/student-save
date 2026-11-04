import Image from "next/image";

// Branded full-area loader for route loading and dashboard data fetches.
export function PageLoader({ message = "Loading StudentSave…" }: { message?: string }) {
  return (
    <main className="page-loader" aria-busy="true">
      <div className="page-loader-card">
        <Image src="/student-save-logo.svg" width={180} height={45} alt="" priority />
        <span className="page-loader-ring" aria-hidden="true"><span /></span>
        <p role="status" aria-live="polite">{message}</p>
        <span className="page-loader-bar" aria-hidden="true"><span /></span>
      </div>
    </main>
  );
}
