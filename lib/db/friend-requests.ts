import { createClient } from "@/lib/supabase/server";
import type {
  FriendRequest,
  FriendRequestWithProfiles,
  FriendRelationshipStatus,
  ProfilePublic,
  SearchUserResult,
} from "@/types/domain";
import { areFriends } from "@/lib/db/friends";
import { searchProfilesByUsername } from "@/lib/db/profiles";

async function attachProfiles(
  requests: FriendRequest[]
): Promise<FriendRequestWithProfiles[]> {
  if (requests.length === 0) return [];

  const userIds = new Set<string>();
  requests.forEach((r) => {
    userIds.add(r.sender_id);
    userIds.add(r.receiver_id);
  });

  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, level, points")
    .in("id", Array.from(userIds));

  if (error) throw error;

  const map = new Map(
    (profiles ?? []).map((p) => [p.id, p as ProfilePublic])
  );

  return requests.map((r) => ({
    ...r,
    sender: map.get(r.sender_id)!,
    receiver: map.get(r.receiver_id)!,
  }));
}

export async function getIncomingFriendRequests(
  userId: string
): Promise<FriendRequestWithProfiles[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("receiver_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return attachProfiles((data ?? []) as FriendRequest[]);
}

export async function getOutgoingFriendRequests(
  userId: string
): Promise<FriendRequestWithProfiles[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("sender_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return attachProfiles((data ?? []) as FriendRequest[]);
}

export async function getPendingRequestBetween(
  userId: string,
  otherUserId: string
): Promise<FriendRequest | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("status", "pending")
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
    )
    .maybeSingle();

  if (error) throw error;
  return data as FriendRequest | null;
}

export async function getRelationshipStatus(
  currentUserId: string,
  targetUserId: string
): Promise<{
  status: FriendRelationshipStatus;
  request_id?: string;
}> {
  if (currentUserId === targetUserId) {
    return { status: "self" };
  }

  if (await areFriends(currentUserId, targetUserId)) {
    return { status: "friends" };
  }

  const pending = await getPendingRequestBetween(currentUserId, targetUserId);
  if (!pending) return { status: "none" };

  if (pending.sender_id === currentUserId) {
    return { status: "pending_sent", request_id: pending.id };
  }
  return { status: "pending_received", request_id: pending.id };
}

export async function searchUsersWithRelationship(
  query: string,
  currentUserId: string
): Promise<SearchUserResult[]> {
  const profiles = await searchProfilesByUsername(query, currentUserId);
  const results: SearchUserResult[] = [];

  for (const profile of profiles) {
    const { status, request_id } = await getRelationshipStatus(
      currentUserId,
      profile.id
    );
    results.push({
      ...profile,
      relationship: status,
      request_id,
    });
  }

  return results;
}
