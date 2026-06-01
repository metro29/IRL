"use client";

import { useEffect } from "react";
import { Coins, Sparkles } from "lucide-react";
import { useFeedbackStore } from "@/store/use-feedback-store";
import { cn } from "@/lib/utils";

export function FloatingRewardLayer() {
  const rewards = useFeedbackStore((s) => s.floatingRewards);
  const dismiss = useFeedbackStore((s) => s.dismissFloating);

  return (
    <div className="pointer-events-none fixed inset-0 z-[210] overflow-hidden">
      {rewards.map((r) => (
        <FloatingItem key={r.id} reward={r} onDone={() => dismiss(r.id)} />
      ))}
    </div>
  );
}

function FloatingItem({
  reward,
  onDone,
}: {
  reward: {
    id: string;
    kind: "xp_gain" | "points_pop";
    x: number;
    y: number;
    value: number;
    label?: string;
  };
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, reward.kind === "xp_gain" ? 2000 : 1400);
    return () => clearTimeout(t);
  }, [onDone, reward.kind]);

  const isXp = reward.kind === "xp_gain";

  return (
    <div
      className={cn(
        "absolute flex items-center gap-1.5 will-change-transform",
        isXp ? "animate-fx-xp-origin" : "animate-fx-points-pop"
      )}
      style={{
        left: reward.x,
        top: reward.y,
        transform: "translate(-50%, -50%)",
      }}
    >
      {isXp ? (
        <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-gradient-to-r from-primary to-amber-500 px-3 py-1.5 text-sm font-bold text-primary-foreground shadow-lg">
          <Sparkles className="h-3.5 w-3.5" />
          +{reward.value} {reward.label ?? "XP"}
        </span>
      ) : (
        <span className="flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-md">
          <Coins className="h-3 w-3" />
          +{reward.value}
        </span>
      )}
    </div>
  );
}
