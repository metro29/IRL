import { createClient } from "@/lib/supabase/client";
import { usernameToAuthEmail } from "@/lib/auth/username-auth";

export async function signInWithUsername(username: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({
    email: usernameToAuthEmail(username.trim().toLowerCase()),
    password,
  });
}

export async function signOut() {
  const supabase = createClient();
  return supabase.auth.signOut();
}
