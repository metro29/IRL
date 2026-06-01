"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/db/profiles";
import { areFriends } from "@/lib/db/friends";
import { getOrCreateDmConversation } from "@/lib/db/dm";
import type { ActionResult } from "@/lib/actions/types";

export async function sendDmMessageAction(
  conversationId: string,
  friendUserId: string,
  message: string
): Promise<ActionResult<{ messageId: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const trimmed = message?.trim();
  if (!trimmed) return { success: false, error: "Message cannot be empty." };

  if (!(await areFriends(userId, friendUserId))) {
    return {
      success: false,
      error: "You can only message friends.",
    };
  }

  const supabase = await createClient();

  const { data: conversation, error: convError } = await supabase
    .from("dm_conversations")
    .select("id, user_a, user_b")
    .eq("id", conversationId)
    .maybeSingle();

  if (convError || !conversation) {
    return { success: false, error: "Conversation not found." };
  }

  const isParticipant =
    conversation.user_a === userId || conversation.user_b === userId;
  const otherId =
    conversation.user_a === userId ? conversation.user_b : conversation.user_a;

  if (!isParticipant || otherId !== friendUserId) {
    return { success: false, error: "Not allowed to message in this thread." };
  }

  const { data, error } = await supabase
    .from("dm_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      message: trimmed,
      message_type: "text",
    })
    .select("id")
    .single();

  if (error) {
    const msg = error.message.includes("friends")
      ? "You can only message friends."
      : error.message;
    return { success: false, error: msg };
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${friendUserId}`);
  return { success: true, data: { messageId: data.id } };
}

export async function openDmWithFriendAction(
  friendUserId: string
): Promise<ActionResult<{ conversationId: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  if (userId === friendUserId) {
    return { success: false, error: "You cannot message yourself." };
  }

  if (!(await areFriends(userId, friendUserId))) {
    return { success: false, error: "You can only message friends." };
  }

  try {
    const conversationId = await getOrCreateDmConversation(userId, friendUserId);
    if (!conversationId) {
      return { success: false, error: "Could not open conversation." };
    }
    return { success: true, data: { conversationId } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Could not open conversation.",
    };
  }
}
