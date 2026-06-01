import { createClient } from "@/lib/supabase/client";

export async function signInAnonymously() {
  const supabase = createClient();
  return supabase.auth.signInAnonymously();
}

export async function signOut() {
  const supabase = createClient();
  return supabase.auth.signOut();
}
