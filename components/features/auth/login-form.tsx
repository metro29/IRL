"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { mapAuthError } from "@/lib/auth/auth-messages";
import {
  normalizeUsername,
  usernameToAuthEmail,
} from "@/lib/auth/username-auth";
import { AuthField } from "@/components/features/auth/auth-field";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { feedback } from "@/lib/feedback/feedback";
import { cn } from "@/lib/utils";

export function LoginForm() {
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
      const usernameRaw = String(formData.get("username") ?? "");
      const password = String(formData.get("password") ?? "");

      if (!usernameRaw || !password) {
        setError("Username and password are required.");
        return;
      }

      const username = normalizeUsername(usernameRaw);
      if (username.length < 3) {
        setError("Enter a valid username.");
        return;
      }

      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword(
        {
          email: usernameToAuthEmail(username),
          password,
        }
      );

      if (signInError) {
        const msg = mapAuthError(signInError.message);
        setError(msg);
        feedback.error("Sign in failed", msg);
        return;
      }

      if (!data.session) {
        setError("Sign in failed — no session returned. Try again.");
        return;
      }

      window.location.href = "/dashboard";
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <p className="text-sm leading-relaxed text-[#f5f2eb]/55">
        Sign in with the username and password you chose when you joined.
      </p>
      <AuthField
        id="username"
        label="Username"
        name="username"
        required
        placeholder="alex_irl"
        autoComplete="username"
      />
      <AuthField
        id="password"
        label="Password"
        name="password"
        type="password"
        required
        placeholder="Your password"
        autoComplete="current-password"
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
          "fx-interactive flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ff7a45] text-sm font-semibold text-[#0a0a0a] transition-opacity hover:opacity-95 disabled:opacity-60"
        )}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <ArrowRight className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>
    </form>
  );
}
