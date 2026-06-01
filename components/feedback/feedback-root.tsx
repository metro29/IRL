"use client";

import { FloatingRewardLayer } from "@/components/feedback/floating-reward-layer";
import { ScreenPulseLayer } from "@/components/feedback/screen-pulse-layer";
import { LevelUpModal } from "@/components/feedback/level-up-modal";
import { EventLiveBanner } from "@/components/feedback/event-live-banner";
import { CelebrationBurst } from "@/components/feedback/celebration-burst";
import { CardHighlightProvider } from "@/components/feedback/card-highlight-provider";

export function FeedbackRoot() {
  return (
    <>
      <CardHighlightProvider />
      <ScreenPulseLayer />
      <FloatingRewardLayer />
      <EventLiveBanner />
      <CelebrationBurst />
      <LevelUpModal />
    </>
  );
}
