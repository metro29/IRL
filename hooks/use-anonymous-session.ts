"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Ensures an anonymous Supabase session exists in the browser before server actions run.
 * Fixes "Auth session missing!" on first-time signup when server getUser() had no cookies yet.
 */
export function useAnonymousSession() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensure() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        if (!cancelled) {
          setReady(true);
          setError(null);
        }
        return;
      }

      const { error: signInError } = await supabase.auth.signInAnonymously();
      if (cancelled) return;

      if (signInError) {
        setError(signInError.message);
        setReady(false);
        return;
      }

      setReady(true);
      setError(null);
    }

    void ensure();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, error };
}
