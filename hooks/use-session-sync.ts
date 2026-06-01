"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/use-app-store";
import type { Profile } from "@/types/database";

export function useSessionSync(initialProfile: Profile | null) {
  const setSession = useAppStore((s) => s.setSession);
  const clearSession = useAppStore((s) => s.clearSession);

  useEffect(() => {
    const supabase = createClient();

    const sync = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        clearSession();
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setSession(user, (profile as Profile | null) ?? initialProfile);
    };

    void sync();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        clearSession();
        return;
      }
      void sync();
    });

    return () => subscription.unsubscribe();
  }, [clearSession, initialProfile, setSession]);
}
