"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@repo/supabase/browser";
import { AuthFrame } from "../_components/AuthFrame";
import styles from "../auth.module.css";

type Wallet = { reference: string; currency: string; ownerName: string };

export default function WalletCreatedPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const [{ data: savedWallet }, { data: profile }] = await Promise.all([
        supabase.from("wallets").select("reference, currency").maybeSingle(),
        supabase.from("profiles").select("full_name").maybeSingle(),
      ]);
      if (!savedWallet) {
        router.replace("/auth/wallet-setup");
        return;
      }
      setWallet({ reference: savedWallet.reference, currency: savedWallet.currency, ownerName: profile?.full_name ?? "" });
    })();
  }, [router]);

  return (
    <AuthFrame>
      <section className={styles.walletCreated} aria-labelledby="wallet-created-title">
        <div className={styles.walletCreatedIcon} aria-hidden="true"><Check size={30} strokeWidth={2.5} /></div>
        <p className={styles.walletCreatedEyebrow}>You’re all set</p>
        <h1 id="wallet-created-title">Wallet created</h1>
        <p className={styles.walletCreatedPhrase}>The road to healthy spending begins here.</p>

        {wallet && (
          <div className={styles.walletAccountSummary}>
            <span>Sabi Save account · {wallet.currency}</span>
            <span>Account name</span>
            <strong className={styles.walletAccountName}>{wallet.ownerName}</strong>
            <span>Test wallet reference</span>
            <strong>{wallet.reference}</strong>
          </div>
        )}
        <Link className={styles.submitButton} href="/dashboard">
          Go to dashboard
        </Link>
      </section>
    </AuthFrame>
  );
}
