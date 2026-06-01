import { type NextRequest, NextResponse } from "next/server";
import {
  getRedirectForAuthenticated,
  getRedirectForGuest,
} from "@/lib/auth/redirect";
import { userHasProfile } from "@/lib/auth/profile";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.next({ request });
  }

  const { supabase, supabaseResponse } = createMiddlewareClient(request);
  const pathname = request.nextUrl.pathname;

  if (!supabase) {
    return supabaseResponse;
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const guestRedirect = getRedirectForGuest(pathname);
      if (guestRedirect) {
        const url = request.nextUrl.clone();
        url.pathname = guestRedirect;
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    const hasProfile = await userHasProfile(supabase, user.id);
    const authRedirect = getRedirectForAuthenticated(pathname, hasProfile);
    if (authRedirect) {
      const url = request.nextUrl.clone();
      url.pathname = authRedirect;
      return NextResponse.redirect(url);
    }

    if (isProtectedWithoutProfile(pathname) && !hasProfile) {
      const url = request.nextUrl.clone();
      url.pathname = "/signup";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch {
    return supabaseResponse;
  }
}

function isProtectedWithoutProfile(pathname: string): boolean {
  const prefixes = [
    "/dashboard",
    "/friends",
    "/messages",
    "/groups",
    "/events",
    "/challenges",
    "/leaderboard",
    "/settings",
    "/admin",
  ];
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
