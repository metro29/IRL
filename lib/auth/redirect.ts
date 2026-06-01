import {
  AUTH_ROUTES,
  DEFAULT_AUTH_REDIRECT,
  DEFAULT_GUEST_REDIRECT,
  PROTECTED_ROUTE_PREFIXES,
} from "@/lib/constants/routes";

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isProtectedRoute(pathname: string): boolean {
  if (pathname === "/") return false;
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function getRedirectForGuest(pathname: string): string | null {
  if (isProtectedRoute(pathname)) {
    return DEFAULT_GUEST_REDIRECT;
  }
  return null;
}

export function getRedirectForAuthenticated(
  pathname: string,
  hasProfile: boolean
): string | null {
  if (pathname === "/") {
    return DEFAULT_AUTH_REDIRECT;
  }

  if (pathname === "/login") {
    return hasProfile ? DEFAULT_AUTH_REDIRECT : "/signup";
  }

  if (pathname === "/signup" && hasProfile) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return null;
}
