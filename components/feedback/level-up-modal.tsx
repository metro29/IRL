"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useFeedbackStore } from "@/store/use-feedback-store";
import { ConfettiLite } from "@/components/feedback/confetti-lite";
import { cn } from "@/lib/utils";

export function LevelUpModal() {
  const open = useFeedbackStore((s) => s.showLevelUpModal);
  const payload = useFeedbackStore((s) => s.levelUp);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    if (!open || !payload) {
      setBarWidth(0);
      return;
    }
    const t = requestAnimationFrame(() => {
      setBarWidth(
        Math.min(100, (payload.xpInLevel / payload.xpForNextLevel) * 100)
      );
    });
    return () => cancelAnimationFrame(t);
  }, [open, payload]);

  if (!open || !payload) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fx-fade-in" />
      <ConfettiLite />
      <div
        className={cn(
          "relative z-10 w-full max-w-sm animate-fx-level-modal",
          "rounded-2xl border border-primary/30 bg-card p-8 text-center shadow-2xl"
        )}
      >
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Level up
        </p>
        <p className="mt-2 text-5xl font-bold tabular-nums text-foreground">
          {payload.level}
        </p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500 transition-[width] duration-700 ease-out"
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {payload.xpInLevel} / {payload.xpForNextLevel} XP this level
        </p>
      </div>
    </div>
  );
}
