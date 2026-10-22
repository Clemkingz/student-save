"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();
  const requestedEmail = searchParams.get("email")?.trim().toLowerCase() || "";
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState<DashboardWallet | null>(null);
  const [profilePicture, setProfilePicture] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const currentEmail = requestedEmail || localStorage.getItem("studentsave:active-email")?.toLowerCase() || "";
    if (!currentEmail) {
      router.replace("/auth/sign-up");
      return;
    }

    const savedWallet = localStorage.getItem(`studentsave:wallet:${currentEmail}`);
    if (!savedWallet) {
      router.replace(`/auth/wallet-setup?email=${encodeURIComponent(currentEmail)}`);
      return;
    }

    try {
      const parsedWallet = JSON.parse(savedWallet) as DashboardWallet;
      if (!parsedWallet.accountNumber) {
        router.replace(`/auth/wallet-setup?email=${encodeURIComponent(currentEmail)}`);
        return;
      }
      const studentDetails = localStorage.getItem(`studentsave:student-verification:${currentEmail}`);
      let studentVerified = false;
      try {
        studentVerified = Boolean(studentDetails && (JSON.parse(studentDetails) as { status?: string }).status === "verified");
      } catch {
        studentVerified = false;
      }
      const appPathname = pathname.replace(/^\/app(?=\/|$)/, "");
      const verificationExempt = appPathname === "/dashboard/student-verification" || appPathname === "/dashboard/settings";
      if (!studentVerified && !verificationExempt) {
        router.replace(`/dashboard/student-verification?email=${encodeURIComponent(currentEmail)}`);
        return;
      }
      localStorage.setItem("studentsave:active-email", currentEmail);
      setEmail(currentEmail);
      setWallet(parsedWallet);
      setProfilePicture(localStorage.getItem(`studentsave:profile-picture:${currentEmail}`) || "");
      setReady(true);
    } catch {
      router.replace(`/auth/wallet-setup?email=${encodeURIComponent(currentEmail)}`);
    }
  }, [pathname, requestedEmail, router]);

  return { email, wallet, profilePicture, ready };
}
