import Image from "next/image";
import { ChartNoAxesCombined, CircleDollarSign, PiggyBank } from "lucide-react";

const upcomingAreas = [
  { label: "Record income and spending", icon: CircleDollarSign },
  { label: "Plan category budgets", icon: ChartNoAxesCombined },
  { label: "Track savings goals", icon: PiggyBank }
];

export default function WorkspaceHome() {
  return (
    <main className="workspace-shell">
      <Image src="/app/student-save-logo.svg" width={205} height={51} alt="StudentSave — Save Smart, Spend Wisely" />
      <section className="workspace-card">
        <span className="workspace-kicker">Your personal money space</span>
        <h1>Your next chapter<br /><span>starts here.</span></h1>
        <p>The StudentSave app is being prepared. Soon you’ll be able to keep track of the money you record, make a plan, and work toward your goals.</p>
        <ul>
          {upcomingAreas.map(({ label, icon: Icon }) => (
            <li key={label}><span><Icon size={17} aria-hidden="true" /></span>{label}</li>
          ))}
        </ul>
        <small>StudentSave records information you enter. It doesn’t connect to your bank or hold your money.</small>
      </section>
    </main>
  );
}
