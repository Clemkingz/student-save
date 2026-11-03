import { createBrowserClient } from "@supabase/ssr";
import { adminSessionCookie } from "./session";
import type { Database } from "./types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

let adminClient: ReturnType<typeof createClient> | undefined;

export function createAdminClient() {
  adminClient ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { isSingleton: false, cookieOptions: { name: adminSessionCookie } },
  );
  return adminClient;
}
