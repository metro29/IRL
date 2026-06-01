import { createClient } from "@/lib/supabase/server";
import { getGroupById } from "@/lib/db/groups";

export async function isGroupAdmin(
  userId: string,
  groupId: string
): Promise<boolean> {
  const group = await getGroupById(groupId);
  if (!group) return false;
  if (group.owner_id === userId) return true;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.role === "admin";
}
