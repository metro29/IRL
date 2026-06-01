import type { SupabaseClient } from "@supabase/supabase-js";

export async function userHasProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}
