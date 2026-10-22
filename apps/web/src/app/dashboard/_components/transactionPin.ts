type WalletPinData = { pinSalt?: string; pinHash?: string };

export async function verifyTransactionPin(email: string, pin: string): Promise<boolean> {
  if (!/^\d{4}$/.test(pin)) return false;
  const savedWallet = localStorage.getItem(`studentsave:wallet:${email}`);
  if (!savedWallet) return false;
  try {
    const wallet = JSON.parse(savedWallet) as WalletPinData;
    if (!wallet.pinSalt || !wallet.pinHash) return false;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${wallet.pinSalt}:${pin}`));
    const candidateHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return candidateHash === wallet.pinHash;
  } catch {
    return false;
  }
}
