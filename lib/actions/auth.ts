"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_AUTH_REDIRECT } from "@/lib/constants/routes";
import type { PostgrestError } from "@supabase/supabase-js";

export type AuthActionResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string };

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function anonymousAuthErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("anonymous") || lower.includes("disabled")) {
    return "Anonymous sign-in is off. In Supabase go to Authentication → Providers and enable Anonymous.";
  }
  if (lower.includes("invalid api key") || lower.includes("api key")) {
    return "Invalid Supabase API key. In Vercel, use the anon (eyJ…) key from Supabase → Project Settings → API.";
  }
  return message;
}

function profileSaveError(error: PostgrestError): string {
  if (error.code === "23505") {
    if (error.message.includes("username")) {
      return "That username is already taken.";
    }
    return "Profile already exists for this account. Try continuing from login.";
  }
  if (error.code === "42P01") {
    return "Database not set up. Run the Supabase migrations in the SQL Editor.";
  }
  if (error.code === "42501") {
    return "Could not save profile. Check that Anonymous auth is enabled in Supabase.";
  }
  return error.message;
}

async function ensureAnonymousUser(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ userId: string } | { error: string }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { error: anonymousAuthErrorMessage(userError.message) };
  }

  if (user) return { userId: user.id };

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    return { error: anonymousAuthErrorMessage(error.message) };
  }

  const userId = data.user?.id;
  if (!userId) {
    return { error: "Could not start a session. Please try again." };
  }

  return { userId };
}

/** Continue on this device — no email or password. */
export async function continueAnonymouslyAction(): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();
    const session = await ensureAnonymousUser(supabase);
    if ("error" in session) {
      return { success: false, error: session.error };
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", session.userId)
      .maybeSingle();

    if (error) {
      return { success: false, error: profileSaveError(error) };
    }

    return {
      success: true,
      redirectTo: profile ? DEFAULT_AUTH_REDIRECT : "/signup",
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Something went wrong. Try again.";
    return { success: false, error: message };
  }
}

/** Pick username + display name after anonymous session starts. */
export async function completeProfileAction(
  formData: FormData
): Promise<AuthActionResult> {
  try {
    const usernameRaw = String(formData.get("username") ?? "");
    const displayName = String(formData.get("displayName") ?? "").trim();

    if (!usernameRaw || !displayName) {
      return { success: false, error: "Username and display name are required." };
    }

    const username = normalizeUsername(usernameRaw);
    if (username.length < 3) {
      return {
        success: false,
        error:
          "Username must be at least 3 characters (letters, numbers, underscore).",
      };
    }

    const supabase = await createClient();
    const session = await ensureAnonymousUser(supabase);
    if ("error" in session) {
      return { success: false, error: session.error };
    }

    const userId = session.userId;

    const { data: taken, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", userId)
      .maybeSingle();

    if (checkError) {
      return { success: false, error: profileSaveError(checkError) };
    }
    if (taken) {
      return { success: false, error: "That username is already taken." };
    }

    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        username,
        display_name: displayName,
        avatar_url: null,
        points: 0,
        xp: 0,
        level: 1,
        streak: 0,
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      return { success: false, error: profileSaveError(upsertError) };
    }

    return { success: true, redirectTo: DEFAULT_AUTH_REDIRECT };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Something went wrong. Try again.";
    return { success: false, error: message };
  }
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
