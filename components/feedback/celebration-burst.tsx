"use client";

import { useFeedbackStore } from "@/store/use-feedback-store";
import { cn } from "@/lib/utils";

/** Go-live center burst + challenge success confetti (non-modal). */
export function CelebrationBurst() {
  const goLive = useFeedbackStore((s) => s.showGoLiveBurst);
  const challenge = useFeedbackStore((s) => s.showChallengeSuccess);
  const levelModal = useFeedbackStore((s) => s.showLevelUpModal);

  if (!goLive && !(challenge && !levelModal)) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[160] flex items-center justify-center">
      {goLive ? (
        <div className="animate-fx-go-live-burst rounded-2xl border-2 border-primary/40 bg-card/90 px-8 py-4 shadow-xl backdrop-blur-sm">
          <p className="text-lg font-bold text-primary">Go live!</p>
        </div>
      ) : null}
      {challenge && !levelModal && !goLive ? (
        <div className="flex gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 w-2 animate-fx-confetti-particle rounded-full bg-primary"
              )}
              style={{ animationDelay: `${i * 45}ms` }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
