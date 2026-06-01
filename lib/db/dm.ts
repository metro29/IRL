import { createClient } from "@/lib/supabase/server";
import { areFriends } from "@/lib/db/friends";
import { toProfilePublic } from "@/lib/db/profiles";
import type {
  DmConversationPreview,
  DmMessageWithAuthor,
  ProfilePublic,
} from "@/types/domain";
import type { Profile } from "@/types/database";

const MESSAGE_SELECT = `
  id,
  conversation_id,
  sender_id,
  message,
  message_type,
  created_at,
  profiles:sender_id (
    id,
    username,
    display_name,
    avatar_url,
    level,
    points,
    xp
  )
`;

function mapMessageRow(row: Record<string, unknown>): DmMessageWithAuthor {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const p = profile as Profile | null | undefined;

  return {
    id: row.id as string,
    conversation_id: row.conversation_id as string,
    sender_id: row.sender_id as string,
    message: row.message as string,
    message_type: row.message_type as "text" | "image",
    created_at: row.created_at as string,
    author: p
      ? toProfilePublic(p)
      : {
          id: row.sender_id as string,
          username: "unknown",
          display_name: "Unknown",
          avatar_url: null,
          level: 1,
          points: 0,
          xp: 0,
        },
  };
}

export async function getOrCreateDmConversation(
  currentUserId: string,
  friendUserId: string
): Promise<string | null> {
  if (!(await areFriends(currentUserId, friendUserId))) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_or_create_dm_conversation", {
    p_other_user_id: friendUserId,
  });

  if (error) throw error;
  return data as string;
}

export async function getDmMessages(
  conversationId: string,
  limit = 100
): Promise<DmMessageWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dm_messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) =>
    mapMessageRow(row as Record<string, unknown>)
  );
}

export async function getDmConversationForFriend(
  currentUserId: string,
  friendUserId: string
): Promise<{ conversationId: string; friend: ProfilePublic } | null> {
  if (!(await areFriends(currentUserId, friendUserId))) {
    return null;
  }

  const conversationId = await getOrCreateDmConversation(
    currentUserId,
    friendUserId
  );
  if (!conversationId) return null;

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, level, points, xp")
    .eq("id", friendUserId)
    .single();

  if (error || !profile) return null;

  return {
    conversationId,
    friend: toProfilePublic(profile as Profile),
  };
}

export async function getDmInbox(
  currentUserId: string
): Promise<DmConversationPreview[]> {
  const supabase = await createClient();
  const { data: conversations, error } = await supabase
    .from("dm_conversations")
    .select("id, user_a, user_b, created_at")
    .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!conversations?.length) return [];

  const previews: DmConversationPreview[] = [];

  for (const conv of conversations) {
    const friendId =
      conv.user_a === currentUserId ? conv.user_b : conv.user_a;

    const [{ data: profile }, { data: lastMsg }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, level, points, xp")
        .eq("id", friendId)
        .single(),
      supabase
        .from("dm_messages")
        .select("message, created_at, sender_id")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!profile) continue;

    previews.push({
      conversation_id: conv.id,
      friend: toProfilePublic(profile as Profile),
      last_message: lastMsg?.message ?? null,
      last_message_at: lastMsg?.created_at ?? null,
      last_sender_id: lastMsg?.sender_id ?? null,
    });
  }

  previews.sort((a, b) => {
    const aTime = a.last_message_at ?? "1970-01-01T00:00:00.000Z";
    const bTime = b.last_message_at ?? "1970-01-01T00:00:00.000Z";
    return bTime.localeCompare(aTime);
  });

  return previews;
}
