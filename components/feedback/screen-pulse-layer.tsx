"use client";

import { useFeedbackStore } from "@/store/use-feedback-store";
import { cn } from "@/lib/utils";

export function ScreenPulseLayer() {
  const pulse = useFeedbackStore((s) => s.screenPulse);

  if (!pulse) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-[140] animate-fx-screen-pulse",
        pulse === "reward" || pulse === "xp_gain"
          ? "bg-primary/[0.04]"
          : pulse === "success"
            ? "bg-emerald-500/[0.04]"
            : "bg-primary/[0.03]"
      )}
      aria-hidden
    />
  );
}
