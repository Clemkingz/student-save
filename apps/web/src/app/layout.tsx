import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { BrowserDataCleanup } from "./BrowserDataCleanup";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudentSave app",
  description: "Your personal StudentSave money-tracking workspace."
};

export const viewport: Viewport = { themeColor: "#fbfcfa", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body><BrowserDataCleanup />{process.env.NEXT_PUBLIC_SIMULATION_MODE !== "false" && <div className="test-mode-banner" role="note">Test mode: simulated money</div>}{children}</body></html>;
}
