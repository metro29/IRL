"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/db/profiles";
import { getSupabaseEnv } from "@/lib/supabase/config";
import type { ActionResult } from "@/lib/actions/types";

function isAllowedAvatarUrl(userId: string, avatarUrl: string): boolean {
  const env = getSupabaseEnv();
  if (!env) return false;
  const base = avatarUrl.split("?")[0] ?? avatarUrl;
  const prefix = `${env.url}/storage/v1/object/public/avatars/${userId}/`;
  return base.startsWith(prefix);
}

export async function updateAvatarAction(
  avatarUrl: string | null
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  if (avatarUrl !== null && !isAllowedAvatarUrl(userId, avatarUrl)) {
    return { success: false, error: "Invalid profile photo URL." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/friends");
  revalidatePath("/leaderboard");
  return { success: true, data: undefined };
}
