import { type NextRequest, NextResponse } from "next/server";
import {
  getRedirectForAuthenticated,
  getRedirectForGuest,
} from "@/lib/auth/redirect";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createMiddlewareClient(request);
  const pathname = request.nextUrl.pathname;

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

  const authRedirect = getRedirectForAuthenticated(pathname);
  if (authRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = authRedirect;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
