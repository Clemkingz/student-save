import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import type { Database } from "./types";

export function createClient(cookies: CookieMethodsServer, cookieName?: string) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies, ...(cookieName ? { cookieOptions: { name: cookieName } } : {}) },
  );
}
