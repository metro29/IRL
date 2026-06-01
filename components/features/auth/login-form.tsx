"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { continueAnonymouslyAction } from "@/lib/actions/auth";
import { feedback } from "@/lib/feedback/feedback";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    setError(null);
    startTransition(async () => {
      const result = await continueAnonymouslyAction();
      if (!result.success) {
        setError(result.error);
        feedback.error("Could not continue", result.error);
        return;
      }
      router.push(result.redirectTo);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-[#f5f2eb]/55">
        No email needed. Your session stays on this browser — use the same device
        to pick up where you left off.
      </p>
      {error ? (
        <p
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={handleContinue}
        className={cn(
          "fx-interactive flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ff7a45] text-sm font-semibold text-[#0a0a0a] transition-opacity hover:opacity-95 disabled:opacity-60"
        )}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Starting…
          </>
        ) : (
          <>
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>
    </div>
  );
}
