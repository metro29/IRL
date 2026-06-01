"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/db/profiles";
import { getUserMembership } from "@/lib/db/groups";
import type { ActionResult } from "@/lib/actions/types";

export async function createGroupAction(
  name: string,
  description?: string
): Promise<ActionResult<{ groupId: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { success: false, error: "Group name must be at least 2 characters." };
  }

  const existing = await getUserMembership(userId);
  if (existing) {
    return {
      success: false,
      error: "You can only belong to one group at a time. Leave your current group first.",
    };
  }

  const supabase = await createClient();

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert([
      {
        name: trimmed,
        description: description?.trim() || null,
        owner_id: userId,
        invite_code: "",
      },
    ])
    .select("*")
    .single();

  if (groupError) {
    return { success: false, error: groupError.message };
  }

  const { error: memberError } = await supabase.from("group_members").insert([
    {
      group_id: group.id,
      user_id: userId,
      role: "admin",
    },
  ]);

  if (memberError) {
    await supabase.from("groups").delete().eq("id", group.id);
    return { success: false, error: memberError.message };
  }

  revalidatePath("/groups");
  revalidatePath(`/groups/${group.id}`);
  return { success: true, data: { groupId: group.id } };
}

export async function joinGroupByInviteCodeAction(
  inviteCode: string
): Promise<ActionResult<{ groupId: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const code = inviteCode.trim().toUpperCase();
  if (code.length !== 8) {
    return { success: false, error: "Invite code must be 8 characters." };
  }

  const existing = await getUserMembership(userId);
  if (existing) {
    return {
      success: false,
      error: "You can only belong to one group at a time.",
    };
  }

  const supabase = await createClient();
  const { data: groupId, error } = await supabase.rpc("join_group_by_invite_code", {
    p_invite_code: code,
  });

  if (error) {
    const message = error.message.includes("Invalid")
      ? "Invalid invite code."
      : error.message.includes("full")
        ? "This group is full."
        : error.message.includes("one group")
          ? "You can only belong to one group at a time."
          : error.message;
    return { success: false, error: message };
  }

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return { success: true, data: { groupId: groupId as string } };
}

export async function leaveGroupAction(
  groupId: string
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const supabase = await createClient();

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("owner_id")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    return { success: false, error: "Group not found." };
  }

  if (group.owner_id === userId) {
    const { error: deleteError } = await supabase
      .from("groups")
      .delete()
      .eq("id", groupId)
      .eq("owner_id", userId);

    if (deleteError) return { success: false, error: deleteError.message };
  } else {
    const { error: leaveError } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (leaveError) return { success: false, error: leaveError.message };
  }

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return { success: true, data: undefined };
}
