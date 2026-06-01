import type { FeedbackEffectType } from "@/lib/feedback/types";

/** Optional sound hook — wire Web Audio or assets here without changing call sites. */
export function playFeedbackSound(_type: FeedbackEffectType): void {
  void _type;
  // Intentionally no-op (visual-only feedback)
}
