"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { signUpAction } from "@/lib/actions/auth";
import { AuthField } from "@/components/features/auth/auth-field";
import { feedback } from "@/lib/feedback/feedback";
import { cn } from "@/lib/utils";

export function SignupForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await signUpAction(formData);
      if (!result.success) {
        setError(result.error);
        feedback.error("Could not create account", result.error);
        return;
      }
      router.push(result.redirectTo);
      router.refresh();
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <p className="text-sm leading-relaxed text-[#f5f2eb]/55">
        Pick a username and password. No email address — you sign in with those two.
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
