import { createClient } from "@/lib/supabase/server";
import { MAX_GROUP_SIZE } from "@/lib/constants/groups";
import type {
  Group,
  GroupMemberDisplayRole,
  GroupMemberWithProfile,
  GroupWithMeta,
} from "@/types/domain";
import type { GroupMemberRole } from "@/types/domain";
import type { ProfilePublic } from "@/types/domain";

export function resolveDisplayRole(
  memberUserId: string,
  memberRole: GroupMemberRole,
  ownerId: string
): GroupMemberDisplayRole {
  if (memberUserId === ownerId) return "owner";
  if (memberRole === "admin") return "admin";
  return "member";
}

export async function getUserMembership(
  userId: string
): Promise<{ group_id: string; role: GroupMemberRole } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as { group_id: string; role: GroupMemberRole };
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();

  if (error) throw error;
  return data as Group | null;
}

export async function getGroupByInviteCode(
  inviteCode: string
): Promise<Group | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("invite_code", inviteCode.trim().toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data as Group | null;
}

export async function getGroupMemberCount(groupId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId);

  if (error) throw error;
  return count ?? 0;
}

export async function isGroupMember(
  groupId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export async function getGroupMembersWithProfiles(
  groupId: string,
  ownerId: string
): Promise<GroupMemberWithProfile[]> {
  const supabase = await createClient();
  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (membersError) throw membersError;
  if (!members?.length) return [];

  const userIds = members.map((m) => m.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, level, points")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p as ProfilePublic])
  );

  return members.map((m) => ({
    id: m.id,
    group_id: m.group_id,
    user_id: m.user_id,
    role: m.role as GroupMemberRole,
    joined_at: m.joined_at,
    profile: profileMap.get(m.user_id)!,
    display_role: resolveDisplayRole(m.user_id, m.role as GroupMemberRole, ownerId),
  }));
}

export async function getGroupWithMetaForUser(
  groupId: string,
  userId: string
): Promise<GroupWithMeta | null> {
  const member = await isGroupMember(groupId, userId);
  if (!member) return null;

  const group = await getGroupById(groupId);
  if (!group) return null;

  const membership = await getUserMembership(userId);
  const memberCount = await getGroupMemberCount(groupId);

  const myRole = resolveDisplayRole(
    userId,
    membership?.role ?? "member",
    group.owner_id
  );

  return {
    ...group,
    member_count: memberCount,
    my_role: myRole,
  };
}

export async function getCurrentUserGroup(): Promise<GroupWithMeta | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const membership = await getUserMembership(user.id);
  if (!membership) return null;

  return getGroupWithMetaForUser(membership.group_id, user.id);
}

export async function canJoinGroup(
  userId: string,
  groupId: string
): Promise<{ ok: boolean; error?: string }> {
  const existing = await getUserMembership(userId);
  if (existing) {
    return { ok: false, error: "You can only belong to one group at a time." };
  }

  if (await isGroupMember(groupId, userId)) {
    return { ok: false, error: "You are already in this group." };
  }

  const count = await getGroupMemberCount(groupId);
  if (count >= MAX_GROUP_SIZE) {
    return { ok: false, error: "This group is full." };
  }

  return { ok: true };
}
