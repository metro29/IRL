"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[auth]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-6 text-[#f5f2eb]">
      <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
      <p className="mt-3 max-w-md text-center text-sm text-[#f5f2eb]/60">
        {error.message || "Could not load this page. Check Supabase env vars and that Anonymous auth is enabled."}
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-[#f5f2eb]/35">Digest: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-[#ff7a45] px-4 py-2 text-sm font-semibold text-[#0a0a0a]"
        >
          Try again
        </button>
        <Link
          href="/login"
          className="rounded-lg border border-[#f5f2eb]/20 px-4 py-2 text-sm font-medium"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
