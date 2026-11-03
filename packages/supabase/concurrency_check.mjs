// Simultaneous spends that together exceed the balance must give one success.
// Uses real sessions, so it commits a test user and deletes it afterwards.
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const query = (sql) =>
  execFileSync("pnpm", ["exec", "supabase", "db", "query", "--linked", sql], { cwd: "../..", stdio: "pipe" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
const { data, error } = await supabase.auth.signUp({
  email: `concurrency-${Date.now()}@example.com`,
  password: crypto.randomUUID(),
});
if (error) throw error;
const userId = data.user.id;

let failed = true;
try {
  await supabase.rpc("create_wallet", { p_pin: "1234" });
  query(`insert into public.student_verifications (user_id, institution, matric_number, level, course, school_id_path, status)
    values ('${userId}', 'Uni', 'M1', '100', 'CS', '${userId}/id.jpg', 'verified');`);
  await supabase.rpc("record_income", { p_amount: 100000, p_category: "Gift", p_occurred_on: null, p_note: "", p_idempotency_key: "seed" });

  const results = await Promise.all(
    [1, 2, 3, 4].map((attempt) =>
      supabase.rpc("start_transfer", {
        p_kind: "expense", p_amount: 60000, p_category: "Food", p_occurred_on: null, p_note: "",
        p_bank_code: "901", p_account_number: "0123456789", p_pin: "1234", p_idempotency_key: `spend-${attempt}`,
      }),
    ),
  );
  const succeeded = results.filter((result) => result.data?.ok).length;
  const refused = results.filter((result) => result.data?.code === "insufficient_balance").length;
  const { data: wallet } = await supabase.from("wallet_balances").select("balance_kobo").single();

  failed = succeeded !== 1 || refused !== 3 || wallet.balance_kobo !== 40000;
  console.log(failed ? `FAILED: ${JSON.stringify({ results, wallet })}` : "all concurrency checks passed");
} finally {
  query(`delete from public.audit_log where actor_id = '${userId}'; delete from auth.users where id = '${userId}';`);
}
process.exit(failed ? 1 : 0);
