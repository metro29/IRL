"use client";

import { ErrorState } from "@/components/shared/state-blocks";

export default function EventsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4 py-8">
      <ErrorState message={error.message} />
      <button type="button" onClick={reset} className="text-sm font-medium text-primary hover:underline">
        Try again
      </button>
    </div>
  );
}
