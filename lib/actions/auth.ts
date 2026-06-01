"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createProfile,
  getProfileByUserId,
  isUsernameAvailable,
  updateProfileBasics,
} from "@/lib/db/profiles";
import { DEFAULT_AUTH_REDIRECT } from "@/lib/constants/routes";

export type AuthActionResult =
  | { success: true }
  | { success: false; error: string };

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export async function signUpAction(formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const usernameRaw = String(formData.get("username") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!email || !password || !usernameRaw || !displayName) {
    return { success: false, error: "All fields are required." };
  }

  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  const username = normalizeUsername(usernameRaw);
  if (username.length < 3) {
    return {
      success: false,
      error: "Username must be at least 3 characters (letters, numbers, underscore).",
    };
  }

  const available = await isUsernameAvailable(username);
  if (!available) {
    return { success: false, error: "That username is already taken." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    const message = error.message.toLowerCase().includes("already")
      ? "An account with this email already exists."
      : error.message;
    return { success: false, error: message };
  }

  const userId = data.user?.id;
  if (!userId) {
    return { success: false, error: "Could not create account. Please try again." };
  }

  const existingProfile = await getProfileByUserId(userId);
  try {
    if (existingProfile) {
      if (existingProfile.username !== username) {
        const available = await isUsernameAvailable(username);
        if (!available) {
          return { success: false, error: "That username is already taken." };
        }
      }
      await updateProfileBasics(userId, {
        username,
        display_name: displayName,
        avatar_url: existingProfile.avatar_url,
      });
    } else {
      await createProfile({
        id: userId,
        username,
        display_name: displayName,
        avatar_url: null,
        points: 0,
        xp: 0,
        level: 1,
        streak: 0,
      });
    }
  } catch (profileError) {
    const msg =
      profileError instanceof Error
        ? profileError.message
        : "Failed to create profile.";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return { success: false, error: "That username is already taken." };
    }
    return { success: false, error: msg };
  }

  redirect(DEFAULT_AUTH_REDIRECT);
}

export async function signInAction(formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: "Invalid email or password." };
  }

  redirect(DEFAULT_AUTH_REDIRECT);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
