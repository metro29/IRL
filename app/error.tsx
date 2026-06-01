"use client";

import { ConfigErrorPanel } from "@/components/layout/config-error-panel";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isConfig =
    error.message.includes("NEXT_PUBLIC_SUPABASE") ||
    error.message.includes("Supabase is not configured") ||
    error.message.includes("MISSING");

  if (isConfig) {
    return (
      <ConfigErrorPanel
        title="Supabase not configured"
        message={error.message}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-6 text-[#f5f2eb]">
      <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
      <p className="mt-3 max-w-md text-center text-sm text-[#f5f2eb]/60">
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-[#f5f2eb]/35">Digest: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="mt-8 rounded-lg bg-[#ff7a45] px-5 py-2.5 text-sm font-semibold text-[#0a0a0a]"
      >
        Try again
      </button>
    </div>
  );
}
