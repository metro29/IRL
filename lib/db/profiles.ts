import { createClient } from "@/lib/supabase/server";
import type { Profile, ProfileInsert, ProfileUpdate } from "@/types/database";
import type { ProfilePublic } from "@/types/domain";

export function toProfilePublic(profile: Profile | ProfilePublic): ProfilePublic {
  return {
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    level: profile.level,
    points: profile.points,
    xp: "xp" in profile ? profile.xp : 0,
  };
}

export async function getProfileByUserId(
  userId: string
): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function getProfileByUsername(
  username: string
): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const existing = await getProfileByUsername(username);
  return existing === null;
}

export async function createProfile(
  profile: ProfileInsert
): Promise<Profile> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .insert([profile])
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function updateProfileBasics(
  userId: string,
  updates: Pick<ProfileInsert, "username" | "display_name" | "avatar_url">
): Promise<Profile> {
  const supabase = await createClient();
  const payload: ProfileUpdate = {
    username: updates.username,
    display_name: updates.display_name,
    avatar_url: updates.avatar_url,
  };
  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return getProfileByUserId(user.id);
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function searchProfilesByUsername(
  query: string,
  excludeUserId: string,
  limit = 20
): Promise<ProfilePublic[]> {
  const supabase = await createClient();
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, level, points, xp")
    .ilike("username", `%${term}%`)
    .neq("id", excludeUserId)
    .order("username")
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ProfilePublic[];
}
