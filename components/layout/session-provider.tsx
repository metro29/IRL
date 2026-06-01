"use client";

import { useSessionSync } from "@/hooks/use-session-sync";
import type { Profile } from "@/types/database";

interface SessionProviderProps {
  profile: Profile | null;
  children: React.ReactNode;
}

export function SessionProvider({ profile, children }: SessionProviderProps) {
  useSessionSync(profile);
  return <>{children}</>;
}
