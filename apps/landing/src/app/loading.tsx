export default function Loading() {
  return (
    <main className="landing-loading" aria-label="Loading StudentSave" aria-busy="true">
      <div className="loading-nav"><span /><span /><span /></div>
      <div className="loading-hero">
        <div className="loading-copy"><i /><b /><b /><span /><span /><span /></div>
        <div className="loading-preview"><i /><b /><span /><span /><span /><span /></div>
      </div>
      <span className="sr-only">Loading the StudentSave website…</span>
    </main>
  );
}
