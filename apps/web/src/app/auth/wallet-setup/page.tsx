"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@repo/supabase/browser";
import { AuthFrame } from "../_components/AuthFrame";
import styles from "../auth.module.css";

export default function WalletSetupPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [ready, setReady] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [pinError, setPinError] = useState("");
  const [confirmPinError, setConfirmPinError] = useState("");

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (isAdmin) {
        router.replace("/admin/student-verifications");
        return;
      }
      const { data: wallet } = await supabase.from("wallets").select("user_id").maybeSingle();
      if (wallet) router.replace("/dashboard");
      else setReady(true);
    })();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setPinError("Enter a 4-digit personal PIN.");
      setConfirmPinError("");
      setNotice("");
      return;
    }
    if (pin !== confirmPin) {
      setPinError("");
      setConfirmPinError("The PINs don’t match.");
      setNotice("");
      return;
    }

    setReady(false); setCreating(true);
    const { data, error } = await createClient().rpc("create_wallet", { p_pin: pin });
    const result = data as { ok?: boolean; code?: string } | null;
    if (error || (!result?.ok && result?.code !== "wallet_exists")) {
      setReady(true); setCreating(false);
      setPinError("We couldn’t create your wallet. Try again.");
      return;
    }
    setPinError("");
    setConfirmPinError("");
    setPin("");
    setConfirmPin("");
    router.push("/auth/wallet-created");
  }

  return (
    <AuthFrame>
      <div className={styles.formHeading}>
        <h1>Set up your wallet</h1>
        <p>One tracked wallet, one account currency.</p>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="currency">Account currency</label>
          <select id="currency" name="currency" className={styles.selectInput} value="NGN" disabled>
            <option value="NGN">Nigerian Naira (NGN ₦)</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="personalPin">Personal PIN</label>
          <input
            id="personalPin"
            name="personalPin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            placeholder="Create a 4-digit PIN"
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
              setPinError("");
              setNotice("");
            }}
            aria-invalid={Boolean(pinError)}
            aria-describedby={pinError ? "personalPin-error" : undefined}
          />
          {pinError && <span className={styles.fieldError} id="personalPin-error">{pinError}</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPin">Confirm personal PIN</label>
          <input
            id="confirmPin"
            name="confirmPin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            placeholder="Re-enter your 4-digit PIN"
            value={confirmPin}
            onChange={(event) => {
              setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 4));
              setConfirmPinError("");
              setNotice("");
            }}
            aria-invalid={Boolean(confirmPinError)}
            aria-describedby={confirmPinError ? "confirmPin-error" : undefined}
          />
          {confirmPinError && <span className={styles.fieldError} id="confirmPin-error">{confirmPinError}</span>}
        </div>

        <button className={styles.submitButton} type="submit" disabled={!ready} aria-busy={creating}>Create wallet</button>
      </form>

      <p className={styles.verificationHint}>
        Your test wallet reference is generated for you. Your PIN is stored as a hash on the server, and never in this browser.
      </p>
      {notice && <p className={styles.verificationSuccess} role="status">{notice}</p>}
    </AuthFrame>
  );
}
