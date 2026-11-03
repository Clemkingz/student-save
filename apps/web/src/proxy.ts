import { createClient } from "@repo/supabase/server";
import { adminSessionCookie } from "@repo/supabase/session";
import { NextResponse, type NextRequest } from "next/server";

const signedOutPages = ["/auth/sign-in"];
const signedInPrefixes = ["/dashboard", "/auth/wallet-setup", "/auth/wallet-created"];
const adminSignIn = "/admin/sign-in";

function redirectTo(request: NextRequest, pathname: string, response: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

// Refreshes the session and sends visitors to the right side of sign-in. RLS and RPCs are the real guard.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const adminArea = pathname.startsWith("/admin");
  const supabase = createClient({
    getAll: () => request.cookies.getAll(),
    setAll(cookies) {
      cookies.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    },
  }, adminArea ? adminSessionCookie : undefined);

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  if (adminArea) {
    if (!signedIn && pathname !== adminSignIn) return redirectTo(request, adminSignIn, response);
    if (signedIn && pathname === adminSignIn) return redirectTo(request, "/admin/student-verifications", response);
    return response;
  }
  if (!signedIn && signedInPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return redirectTo(request, "/auth/sign-in", response);
  }
  if (signedIn && signedOutPages.includes(pathname)) {
    return redirectTo(request, "/dashboard", response);
  }
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/auth/:path*"],
};
