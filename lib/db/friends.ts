import { createClient } from "@/lib/supabase/server";
import type { Friendship } from "@/types/domain";
import { toProfilePublic } from "@/lib/db/profiles";
import type { FriendWithProfile } from "@/types/domain";
import type { Profile } from "@/types/database";

export async function getFriendshipsForUser(
  userId: string
): Promise<Friendship[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friends")
    .select("*")
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Friendship[];
}

export async function getFriendsWithProfiles(
  userId: string
): Promise<FriendWithProfile[]> {
  const friendships = await getFriendshipsForUser(userId);
  if (friendships.length === 0) return [];

  const friendIds = friendships.map((f) =>
    f.user_id === userId ? f.friend_id : f.user_id
  );

  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, level, points, xp")
    .in("id", friendIds);

  if (error) throw error;

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, toProfilePublic(p as Profile)])
  );

  return friendships
    .map((f) => {
      const friendId = f.user_id === userId ? f.friend_id : f.user_id;
      const friend = profileMap.get(friendId);
      if (!friend) return null;
      return {
        friendship_id: f.id,
        friend,
        created_at: f.created_at,
      };
    })
    .filter((x): x is FriendWithProfile => x !== null);
}

export async function areFriends(
  userId: string,
  otherUserId: string
): Promise<boolean> {
  const low = userId < otherUserId ? userId : otherUserId;
  const high = userId < otherUserId ? otherUserId : userId;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friends")
    .select("id")
    .eq("user_id", low)
    .eq("friend_id", high)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}
