import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function getSession(): Promise<Session | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

export async function getUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}
