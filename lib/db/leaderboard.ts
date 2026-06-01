import { createClient } from "@/lib/supabase/server";
import type { LeaderboardEntry, ProfilePublic } from "@/types/domain";

export async function getGroupLeaderboard(
  groupId: string
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  const { data: members, error: memberError } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (memberError) throw memberError;
  if (!members?.length) return [];

  const userIds = members.map((m) => m.user_id);
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, level, points, xp")
    .in("id", userIds)
    .order("points", { ascending: false })
    .order("xp", { ascending: false });

  if (error) throw error;

  return (profiles ?? []).map((p, index) => ({
    rank: index + 1,
    profile: p as ProfilePublic,
    points: p.points,
    xp: p.xp,
    level: p.level,
  }));
}

export async function getGlobalLeaderboard(
  limit = 50
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, level, points, xp")
    .order("points", { ascending: false })
    .order("xp", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (profiles ?? []).map((p, index) => ({
    rank: index + 1,
    profile: p as ProfilePublic,
    points: p.points,
    xp: p.xp,
    level: p.level,
  }));
}
