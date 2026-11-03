import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudentSave — Save smart. Spend wisely.",
  description: "A little more clarity for student money. Track spending, make a plan, and build toward the things that matter to you."
};

export const viewport: Viewport = { themeColor: "#f8fbf9", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{process.env.NEXT_PUBLIC_SIMULATION_MODE !== "false" && <div className="test-mode-banner" role="note">Test mode: simulated money</div>}{children}</body></html>;
}
