"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@repo/supabase/browser";


export type DashboardWallet = {
  accountNumber: string;
  accountName?: string;
  ownerName?: string;
  email?: string;
  currency?: string;
};

export function useDashboardSession() {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState<DashboardWallet | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user?.email) {
        router.replace("/auth/sign-in");
        return;
      }
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (cancelled) return;
      if (isAdmin) {
        // Only sessions from before admins had their own cookie can reach this.
        await supabase.auth.signOut({ scope: "local" });
        router.replace("/admin/sign-in");
        return;
      }
      const currentEmail = user.email.toLowerCase();
      const [{ data: savedWallet }, { data: profile }, { data: verification }] = await Promise.all([
        supabase.from("wallets").select("reference, currency").maybeSingle(),
        supabase.from("profiles").select("full_name").maybeSingle(),
        supabase.from("student_verifications").select("status").maybeSingle(),
      ]);
      if (cancelled) return;
      if (!savedWallet) {
        router.replace("/auth/wallet-setup");
        return;
      }

      const verificationExempt = pathname === "/dashboard/student-verification" || pathname === "/dashboard/settings";
      if (verification?.status !== "verified" && !verificationExempt) {
        router.replace("/dashboard/student-verification");
        return;
      }
      setUserId(user.id);
      setEmail(currentEmail);
      setWallet({
        accountNumber: savedWallet.reference,
        accountName: "Sabi Save account",
        ownerName: profile?.full_name || currentEmail,
        email: currentEmail,
        currency: savedWallet.currency,
      });
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [pathname, router]);

  return { userId, email, wallet, ready };
}
