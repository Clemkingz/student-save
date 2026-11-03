import type { ReactNode } from "react";
import { QueryProvider } from "./_components/QueryProvider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
