export const financeEvent = "studentsave:finance-updated";
const journalKey = (email: string) => `studentsave:finance-pending:${email}`;

export function recoverFinance(email: string) {
  const saved = localStorage.getItem(journalKey(email));
  if (!saved) return;
  const updates = JSON.parse(saved) as Record<string, string>;
  for (const [key, value] of Object.entries(updates))
    localStorage.setItem(key, value);
  localStorage.removeItem(journalKey(email));
}

// Recover interrupted multi-record writes before another operation can run.
export function saveFinance(email: string, values: Record<string, unknown>) {
  const updates = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, JSON.stringify(value)]),
  );
  const key = journalKey(email);
  const previous = Object.fromEntries(
    Object.keys(updates).map((name) => [name, localStorage.getItem(name)]),
  );
  localStorage.setItem(key, JSON.stringify(updates));
  try {
    recoverFinance(email);
  } catch (error) {
    // Restore the last complete state if a storage quota is reached.
    localStorage.removeItem(key);
    for (const [name, value] of Object.entries(previous)) {
      if (value === null) localStorage.removeItem(name);
      else localStorage.setItem(name, value);
    }
    throw error;
  }
  for (const name of Object.keys(updates))
    window.dispatchEvent(new StorageEvent("storage", { key: name }));
  window.dispatchEvent(new Event(financeEvent));
}

export async function withFinanceLock<T>(
  email: string,
  action: () => T | Promise<T>,
): Promise<T> {
  if (navigator.locks)
    return navigator.locks.request(`studentsave:finance:${email}`, action);
  return action();
}

export function readFinanceList<T>(key: string): T[] {
  const saved = localStorage.getItem(key);
  if (!saved) return [];
  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed))
    throw new Error("Saved finance records could not be read.");
  return parsed as T[];
}
