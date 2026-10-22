export default function Loading() {
  return (
    <main className="page-shell status-page" aria-label="Loading StudentSave" aria-busy="true">
      <section className="loading-card" aria-hidden="true">
        <div className="skeleton" style={{ width: 112, height: 16 }} />
        <div className="skeleton skeleton-large" />
        <div className="skeleton skeleton-line" style={{ width: "42%" }} />
        <div className="skeleton skeleton-chart" />
        <div className="preview-rows"><div className="skeleton" style={{ height: 58 }} /><div className="skeleton" style={{ height: 58 }} /></div>
      </section>
      <span className="sr-only">Loading your StudentSave page…</span>
    </main>
  );
}
