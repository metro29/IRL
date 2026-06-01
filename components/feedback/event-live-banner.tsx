"use client";

import { Radio } from "lucide-react";
import { useFeedbackStore } from "@/store/use-feedback-store";
import { cn } from "@/lib/utils";

export function EventLiveBanner() {
  const show = useFeedbackStore((s) => s.showEventBanner);

  if (!show) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed left-0 right-0 top-16 z-[130]",
        "animate-fx-banner-slide"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="fx-event-glow flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 backdrop-blur-md">
          <Radio className="h-4 w-4 animate-pulse text-primary" />
          <span className="text-sm font-semibold text-primary">Event is live</span>
          <span className="text-sm text-muted-foreground">
            · Challenges unlocked
          </span>
        </div>
      </div>
    </div>
  );
}
