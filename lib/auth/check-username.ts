import { createClient } from "@/lib/supabase/client";

export async function checkUsernameTakenClient(
  username: string
): Promise<{ taken: boolean; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("is_username_taken", {
    check_username: username.toLowerCase(),
  });

  if (error) {
    const msg = error.message.includes("is_username_taken")
      ? "Run migration 20260531400000_username_check_rpc.sql in Supabase SQL Editor."
      : error.message;
    return { taken: false, error: msg };
  }

  return { taken: data === true, error: null };
}
