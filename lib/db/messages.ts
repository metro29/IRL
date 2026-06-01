import { createClient } from "@/lib/supabase/server";
import type { GroupMessageWithAuthor } from "@/types/domain";

const MESSAGE_SELECT = `
  id,
  group_id,
  user_id,
  message,
  message_type,
  created_at,
  profiles:user_id (
    id,
    username,
    display_name,
    avatar_url,
    level,
    points,
    xp
  )
`;

export async function getGroupMessages(
  groupId: string,
  limit = 80
): Promise<GroupMessageWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_messages")
    .select(MESSAGE_SELECT)
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id as string,
      group_id: row.group_id as string,
      user_id: row.user_id as string,
      message: row.message as string,
      message_type: row.message_type as "text" | "image",
      created_at: row.created_at as string,
      author: profile
        ? {
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            level: profile.level,
            points: profile.points,
            xp: profile.xp,
          }
        : {
            id: row.user_id as string,
            username: "unknown",
            display_name: "Unknown",
            avatar_url: null,
            level: 1,
            points: 0,
            xp: 0,
          },
    };
  });
}
