export const AUTH_ROUTES = ["/login", "/signup"] as const;

export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/friends",
  "/groups",
  "/events",
  "/challenges",
  "/leaderboard",
  "/settings",
  "/admin",
] as const;

export const DEFAULT_AUTH_REDIRECT = "/dashboard";
export const DEFAULT_GUEST_REDIRECT = "/login";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/friends", label: "Friends", icon: "Users" },
  { href: "/groups", label: "Groups", icon: "UsersRound" },
  { href: "/events", label: "Events", icon: "Calendar" },
  { href: "/challenges", label: "Challenges", icon: "Target" },
  { href: "/leaderboard", label: "Leaderboard", icon: "Trophy" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const;

export const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: "LayoutDashboard" },
  { href: "/groups", label: "Groups", icon: "UsersRound" },
  { href: "/events", label: "Events", icon: "Calendar" },
  { href: "/settings", label: "Profile", icon: "User" },
] as const;
