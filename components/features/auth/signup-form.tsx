"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { signUpAction } from "@/lib/actions/auth";
import { AuthField } from "@/components/features/auth/auth-field";
import { feedback } from "@/lib/feedback/feedback";
import { cn } from "@/lib/utils";

export function SignupForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await signUpAction(formData);
      if (result && !result.success) {
        setError(result.error);
        feedback.error("Sign up failed", result.error);
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
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
        hint="Letters, numbers, and underscores only."
      />
      <AuthField
        id="email"
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@school.edu"
      />
      <AuthField
        id="password"
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="At least 8 characters"
        hint="Use something you won't forget after the weekend."
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
            Create account
            <ArrowRight className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>
    </form>
  );
}
