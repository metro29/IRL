import { createClient } from "@/lib/supabase/server";
import type { NotificationRow } from "@/types/domain";

export async function getNotificationsForUser(
  userId: string,
  limit = 40
): Promise<NotificationRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, body, read, metadata, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

    if (error) return [];
    return (data ?? []) as NotificationRow[];
  } catch {
    return [];
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
