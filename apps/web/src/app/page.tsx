import Image from "next/image";
import { ArrowRight } from "lucide-react";

const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL || "/landing";

export default function WorkspaceHome() {
  return (
    <main className="workspace-shell">
      <Image src="/student-save-logo.svg" width={205} height={51} alt="StudentSave — Save Smart, Spend Wisely" />
      <section className="workspace-card">
        <span className="workspace-kicker">Your personal money space</span>
        <h1>Your next chapter<br /><span>starts here.</span></h1>
        <p>Discover how StudentSave helps you track your spending, plan your budget, and work toward your savings goals.</p>
        <a className="workspace-continue" href={landingUrl}>
          Continue <ArrowRight size={18} aria-hidden="true" />
        </a>
      </section>
    </main>
  );
}
