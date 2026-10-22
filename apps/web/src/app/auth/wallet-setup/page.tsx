"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFrame } from "../_components/AuthFrame";
import styles from "../auth.module.css";

function createUniqueAccountNumber() {
  const usedNumbers = new Set<string>();
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;
    const value = localStorage.getItem(key);
    if (!value) continue;
    if (key.startsWith("studentsave:wallet-account-number:")) {
      usedNumbers.add(value);
      continue;
    }
    if (key.startsWith("studentsave:wallet:")) {
      try {
        const wallet = JSON.parse(value) as { accountNumber?: string };
        if (wallet.accountNumber) usedNumbers.add(wallet.accountNumber);
      } catch {
        // Ignore unrelated or invalid mock wallet records.
      }
    }
  }

  let candidate = "";
  do {
    const randomDigits = new Uint8Array(10);
    crypto.getRandomValues(randomDigits);
    candidate = `${1 + ((randomDigits[0] ?? 0) % 9)}${Array.from(randomDigits.slice(1), (digit) => digit % 10).join("")}`;
  } while (usedNumbers.has(candidate));
  return candidate;
}

function WalletSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  const verificationKey = `studentsave:email-verification:${email}`;
  const walletKey = `studentsave:wallet:${email}`;
  const accountNumberKey = `studentsave:wallet-account-number:${email}`;
  const [accountNumber, setAccountNumber] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [pinError, setPinError] = useState("");
  const [confirmPinError, setConfirmPinError] = useState("");

  useEffect(() => {
    if (!email) {
      router.replace("/auth/verify-email");
      return;
    }

    const verification = localStorage.getItem(verificationKey);
    try {
      if (!verification || !JSON.parse(verification).verified) {
        router.replace(`/auth/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
    } catch {
      router.replace(`/auth/verify-email?email=${encodeURIComponent(email)}`);
      return;
    }

    const savedWallet = localStorage.getItem(walletKey);
    let existingAccountNumber = localStorage.getItem(accountNumberKey);
    if (savedWallet) {
      try {
        const wallet = JSON.parse(savedWallet) as { accountNumber?: string };
        if (typeof wallet.accountNumber === "string") existingAccountNumber = wallet.accountNumber;
      } catch {
        localStorage.removeItem(walletKey);
      }
    }
    if (!existingAccountNumber) {
      existingAccountNumber = createUniqueAccountNumber();
    }
    localStorage.setItem(accountNumberKey, existingAccountNumber);
    setAccountNumber(existingAccountNumber);
    setReady(true);
  }, [accountNumberKey, email, router, verificationKey, walletKey]);

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

    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const saltHex = Array.from(salt, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const pinHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${saltHex}:${pin}`));
    const hashedPin = Array.from(new Uint8Array(pinHash), (byte) => byte.toString(16).padStart(2, "0")).join("");
    let ownerName = email;
    const savedProfile = localStorage.getItem(`studentsave:mock-account:${email}`);
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile) as { fullName?: string };
        if (profile.fullName?.trim()) ownerName = profile.fullName.trim();
      } catch {
        // Use the verified email as the account owner label if profile data is unavailable.
      }
    }
    localStorage.setItem(walletKey, JSON.stringify({
      currency: "NGN",
      accountName: "Sabi Save account",
      accountNumber,
      ownerName,
      email,
      pinSalt: saltHex,
      pinHash: hashedPin,
      createdAt: new Date().toISOString(),
    }));
    setPinError("");
    setConfirmPinError("");
    setPin("");
    setConfirmPin("");
    router.push(`/auth/wallet-created?email=${encodeURIComponent(email)}`);
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
          <label htmlFor="accountNumber">Wallet account number</label>
          <input
            id="accountNumber"
            name="accountNumber"
            type="text"
            autoComplete="off"
            readOnly
            value={accountNumber}
            aria-readonly="true"
          />
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

        <button className={styles.submitButton} type="submit" disabled={!ready}>Create wallet</button>
      </form>

      <p className={styles.verificationHint}>
        Your account number is generated for you. Your PIN is saved as a salted hash on this device.
      </p>
      {notice && <p className={styles.verificationSuccess} role="status">{notice}</p>}
    </AuthFrame>
  );
}

export default function WalletSetupPage() {
  return (
    <Suspense fallback={null}>
      <WalletSetupContent />
    </Suspense>
  );
}
