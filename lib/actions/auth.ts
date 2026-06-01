"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createProfile,
  getProfileByUserId,
  isUsernameAvailable,
  updateProfileBasics,
} from "@/lib/db/profiles";
import {
  normalizeUsername,
  usernameToAuthEmail,
} from "@/lib/auth/username-auth";
import { DEFAULT_AUTH_REDIRECT } from "@/lib/constants/routes";
export type AuthActionResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string };

function authErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid api key") || lower.includes("api key")) {
    return "Invalid Supabase API key. Use the anon (eyJ…) key from Supabase → Project Settings → API.";
  }
  if (lower.includes("email not confirmed") || lower.includes("confirm")) {
    return "Email confirmation is on in Supabase. Turn it off: Authentication → Providers → Email → disable Confirm email.";
  }
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Wrong username or password.";
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "That username is already taken. Sign in instead.";
  }
  return message;
}

/** Sign in with username + password (no email field in the UI). */
export async function signInAction(formData: FormData): Promise<AuthActionResult> {
  try {
    const usernameRaw = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    if (!usernameRaw || !password) {
      return { success: false, error: "Username and password are required." };
    }

    const username = normalizeUsername(usernameRaw);
    if (username.length < 3) {
      return { success: false, error: "Enter a valid username." };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToAuthEmail(username),
      password,
    });

    if (error) {
      return { success: false, error: authErrorMessage(error.message) };
    }

    return { success: true, redirectTo: DEFAULT_AUTH_REDIRECT };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Sign in failed. Try again.",
    };
  }
}

/** Create account: username, display name, password — no real email. */
export async function signUpAction(formData: FormData): Promise<AuthActionResult> {
  try {
    const usernameRaw = String(formData.get("username") ?? "");
    const displayName = String(formData.get("displayName") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!usernameRaw || !displayName || !password) {
      return {
        success: false,
        error: "Display name, username, and password are required.",
      };
    }

    if (password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters." };
    }

    const username = normalizeUsername(usernameRaw);
    if (username.length < 3) {
      return {
        success: false,
        error:
          "Username must be at least 3 characters (letters, numbers, underscore).",
      };
    }

    const available = await isUsernameAvailable(username);
    if (!available) {
      return { success: false, error: "That username is already taken." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: usernameToAuthEmail(username),
      password,
      options: {
        data: { display_name: displayName, username },
      },
    });

    if (error) {
      return { success: false, error: authErrorMessage(error.message) };
    }

    const userId = data.user?.id;
    if (!userId) {
      return { success: false, error: "Could not create account. Try again." };
    }

    const existingProfile = await getProfileByUserId(userId);
    try {
      if (existingProfile) {
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

    return { success: true, redirectTo: DEFAULT_AUTH_REDIRECT };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Sign up failed. Try again.",
    };
  }
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
