"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { mapAuthError } from "@/lib/auth/auth-messages";
import { checkUsernameTakenClient } from "@/lib/auth/check-username";
import {
  normalizeUsername,
  usernameToAuthEmail,
} from "@/lib/auth/username-auth";
import { AuthField } from "@/components/features/auth/auth-field";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { feedback } from "@/lib/feedback/feedback";
import { cn } from "@/lib/utils";

export function SignupForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    if (!isSupabaseConfigured()) {
      setError(
        "Supabase env vars missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY on Vercel, then redeploy."
      );
      return;
    }

    setError(null);
    startTransition(async () => {
      const displayName = String(formData.get("displayName") ?? "").trim();
      const usernameRaw = String(formData.get("username") ?? "");
      const password = String(formData.get("password") ?? "");

      if (!displayName || !usernameRaw || !password) {
        setError("Display name, username, and password are required.");
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }

      const username = normalizeUsername(usernameRaw);
      if (username.length < 3) {
        setError(
          "Username must be at least 3 characters (letters, numbers, underscore)."
        );
        return;
      }

      const { taken, error: checkError } =
        await checkUsernameTakenClient(username);

      if (checkError) {
        setError(checkError);
        return;
      }

      if (taken) {
        setError("That username is already taken.");
        return;
      }

      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: usernameToAuthEmail(username),
        password,
        options: {
          data: { display_name: displayName, username },
        },
      });

      if (signUpError) {
        const msg = mapAuthError(signUpError.message);
        setError(msg);
        feedback.error("Could not create account", msg);
        return;
      }

      if (!data.user) {
        setError("Could not create account. Try again.");
        return;
      }

      if (!data.session) {
        setError(
          "Account created but no session. In Supabase disable Confirm email under Authentication → Email, then try again."
        );
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          username,
          display_name: displayName,
        },
        { onConflict: "id" }
      );

      if (profileError) {
        const msg = profileError.message.includes("duplicate")
          ? "That username is already taken."
          : profileError.message;
        setError(msg);
        feedback.error("Could not save profile", msg);
        return;
      }

      feedback.success("Welcome to IRL!");
      window.location.href = "/dashboard";
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <p className="text-sm leading-relaxed text-[#f5f2eb]/55">
        Pick a username and password. No email — you sign in with those two.
      </p>
      <AuthField
        id="displayName"
        label="Display name"
        name="displayName"
        required
        placeholder="Alex"
        maxLength={50}
      />
      <AuthField
        id="username"
        label="Username"
        name="username"
        required
        placeholder="alex_irl"
        pattern="[a-zA-Z0-9_]{3,24}"
        title="3–24 characters: letters, numbers, underscore"
        hint="This is your login ID."
        autoComplete="username"
      />
      <AuthField
        id="password"
        label="Password"
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="At least 8 characters"
        hint="Remember this — there is no email reset yet."
        autoComplete="new-password"
      />
      {error ? (
        <p
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "fx-interactive mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ff7a45] text-sm font-semibold text-[#0a0a0a] transition-opacity hover:opacity-95 disabled:opacity-60"
        )}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Creating account…
          </>
        ) : (
          <>
            Enter IRL
            <ArrowRight className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>
    </form>
  );
}
