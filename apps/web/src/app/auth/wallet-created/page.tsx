"use client";

import { Suspense, useEffect, useState } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFrame } from "../_components/AuthFrame";
import styles from "../auth.module.css";

type Wallet = { accountNumber: string; currency: string; accountName?: string; ownerName?: string };

function WalletCreatedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  const [wallet, setWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    if (!email) {
      router.replace("/auth/sign-up");
      return;
    }

    const savedWallet = localStorage.getItem(`studentsave:wallet:${email}`);
    if (!savedWallet) {
      router.replace(`/auth/wallet-setup?email=${encodeURIComponent(email)}`);
      return;
    }

    try {
      const parsedWallet = JSON.parse(savedWallet) as Wallet;
      if (!parsedWallet.accountNumber) {
        router.replace(`/auth/wallet-setup?email=${encodeURIComponent(email)}`);
        return;
      }
      setWallet(parsedWallet);
    } catch {
      router.replace(`/auth/wallet-setup?email=${encodeURIComponent(email)}`);
    }
  }, [email, router]);

  return (
    <AuthFrame>
      <section className={styles.walletCreated} aria-labelledby="wallet-created-title">
        <div className={styles.walletCreatedIcon} aria-hidden="true"><Check size={30} strokeWidth={2.5} /></div>
        <p className={styles.walletCreatedEyebrow}>You’re all set</p>
        <h1 id="wallet-created-title">Wallet created</h1>
        <p className={styles.walletCreatedPhrase}>The road to healthy spending begins here.</p>

        {wallet && (
          <div className={styles.walletAccountSummary}>
            <span>{wallet.accountName || "Sabi Save account"} · {wallet.currency}</span>
            <span>Account name</span>
            <strong className={styles.walletAccountName}>{wallet.ownerName || email}</strong>
            <span>Account number</span>
            <strong>{wallet.accountNumber}</strong>
          </div>
        )}
        <Link className={styles.submitButton} href={`/dashboard?email=${encodeURIComponent(email)}`}>
          Go to dashboard
        </Link>
      </section>
    </AuthFrame>
  );
}

export default function WalletCreatedPage() {
  return (
    <Suspense fallback={null}>
      <WalletCreatedContent />
    </Suspense>
  );
}
