"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/db/profiles";
import { isGroupMember } from "@/lib/db/groups";
import type { ActionResult } from "@/lib/actions/types";

export async function sendGroupMessageAction(
  groupId: string,
  message: string,
  messageType: "text" | "image" = "text"
): Promise<ActionResult<{ messageId: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const trimmed = message?.trim();
  if (!trimmed) return { success: false, error: "Message cannot be empty." };

  if (!(await isGroupMember(groupId, userId))) {
    return { success: false, error: "Not a member of this group." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_messages")
    .insert({
      group_id: groupId,
      user_id: userId,
      message: trimmed,
      message_type: messageType,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/groups/${groupId}`);
  return { success: true, data: { messageId: data.id } };
}
