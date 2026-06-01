"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/db/profiles";
import { areFriends } from "@/lib/db/friends";
import { getPendingRequestBetween } from "@/lib/db/friend-requests";
import type { ActionResult } from "@/lib/actions/types";
import type { SearchUserResult } from "@/types/domain";
import { searchUsersWithRelationship } from "@/lib/db/friend-requests";

export async function searchUsersAction(
  query: string
): Promise<ActionResult<SearchUserResult[]>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  try {
    const results = await searchUsersWithRelationship(query, userId);
    return { success: true, data: results };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Search failed.",
    };
  }
}

export async function sendFriendRequestAction(
  receiverId: string
): Promise<ActionResult<{ requestId: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  if (userId === receiverId) {
    return { success: false, error: "You cannot add yourself as a friend." };
  }

  if (await areFriends(userId, receiverId)) {
    return { success: false, error: "You are already friends." };
  }

  const existing = await getPendingRequestBetween(userId, receiverId);
  if (existing) {
    return { success: false, error: "A friend request is already pending." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_friend_request", {
    p_receiver_id: receiverId,
  });

  if (error) {
    const msg = error.message.includes("already sent you")
      ? error.message
      : error.message.includes("already pending")
        ? "A friend request is already pending."
        : error.message.includes("already friends")
          ? "You are already friends."
          : error.message.includes("Not authenticated")
            ? "Not authenticated."
            : error.message.includes("cannot add yourself")
              ? "You cannot add yourself as a friend."
              : error.message;
    return { success: false, error: msg };
  }

  revalidatePath("/friends");
  return { success: true, data: { requestId: data as string } };
}

export async function cancelFriendRequestAction(
  requestId: string
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("friend_requests")
    .delete()
    .eq("id", requestId)
    .eq("sender_id", userId)
    .eq("status", "pending");

  if (error) return { success: false, error: error.message };

  revalidatePath("/friends");
  return { success: true, data: undefined };
}

export async function acceptFriendRequestAction(
  requestId: string
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_friend_request", {
    p_request_id: requestId,
  });

  if (error) {
    return {
      success: false,
      error: error.message.includes("not found")
        ? "Request not found or already handled."
        : error.message,
    };
  }

  revalidatePath("/friends");
  return { success: true, data: undefined };
}

export async function rejectFriendRequestAction(
  requestId: string
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("receiver_id", userId)
    .eq("status", "pending");

  if (error) return { success: false, error: error.message };

  revalidatePath("/friends");
  return { success: true, data: undefined };
}
