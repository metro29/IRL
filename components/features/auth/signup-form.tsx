"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { completeProfileAction } from "@/lib/actions/auth";
import { AuthField } from "@/components/features/auth/auth-field";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import { feedback } from "@/lib/feedback/feedback";
import { cn } from "@/lib/utils";

export function SignupForm() {
  const router = useRouter();
  const { ready: sessionReady, error: sessionError } = useAnonymousSession();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    if (!sessionReady) return;

    setError(null);
    startTransition(async () => {
      const result = await completeProfileAction(formData);
      if (!result.success) {
        setError(result.error);
        feedback.error("Could not save profile", result.error);
        return;
      }
      router.push(result.redirectTo);
      router.refresh();
    });
  };

  const displayError = error ?? sessionError;

  return (
    <form action={handleSubmit} className="space-y-4">
      <p className="text-sm leading-relaxed text-[#f5f2eb]/55">
        Choose how your crew sees you. No email — just a username and display name.
      </p>
      {!sessionReady && !sessionError ? (
        <p className="flex items-center gap-2 text-sm text-[#f5f2eb]/50">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Starting your session…
        </p>
      ) : null}
      <AuthField
        id="displayName"
        label="Display name"
        name="displayName"
        required
        placeholder="Alex"
        maxLength={50}
        disabled={!sessionReady}
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
        disabled={!sessionReady}
      />
      {displayError ? (
        <p
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {displayError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !sessionReady}
        className={cn(
          "fx-interactive mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ff7a45] text-sm font-semibold text-[#0a0a0a] transition-opacity hover:opacity-95 disabled:opacity-60"
        )}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Saving…
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
