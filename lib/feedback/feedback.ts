"use client";

import { toast } from "@/hooks/use-toast";
import { useFeedbackStore } from "@/store/use-feedback-store";
import { playFeedbackSound } from "@/lib/feedback/sound-hook";
import type { FeedbackOrigin } from "@/lib/feedback/types";

const XP_PER_LEVEL = 100;

function centerOrigin(): FeedbackOrigin {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.3 };
}

function originFromElement(el: HTMLElement | null): FeedbackOrigin {
  if (!el) return centerOrigin();
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export const feedback = {
  success(title: string, description?: string) {
    playFeedbackSound("success");
    useFeedbackStore.getState().triggerScreenPulse("success");
    toast({ title, description, variant: "success" });
  },

  error(title: string, description?: string) {
    playFeedbackSound("error");
    toast({ title, description, variant: "destructive" });
  },

  info(title: string, description?: string) {
    playFeedbackSound("info");
    toast({ title, description, variant: "info" });
  },

  reward(message?: string) {
    playFeedbackSound("reward");
    useFeedbackStore.getState().triggerScreenPulse("reward");
    useFeedbackStore.getState().triggerChallengeSuccess();
    if (message) toast({ title: message });
  },

  levelUp(level: number, newXp?: number) {
    playFeedbackSound("level_up");
    const xpInLevel = newXp !== undefined ? newXp % XP_PER_LEVEL : 0;
    useFeedbackStore.getState().showLevelUp({
      level,
      xpInLevel,
      xpForNextLevel: XP_PER_LEVEL,
    });
  },

  xpGain(options: {
    xp: number;
    points?: number;
    origin?: FeedbackOrigin | HTMLElement | null;
    cardId?: string;
    message?: string;
  }) {
    playFeedbackSound("xp_gain");
    const store = useFeedbackStore.getState();
    const origin =
      options.origin instanceof HTMLElement
        ? originFromElement(options.origin)
        : options.origin ?? centerOrigin();

    store.pushFloating({
      kind: "xp_gain",
      x: origin.x,
      y: origin.y,
      value: options.xp,
      label: "XP",
    });

    if (options.points && options.points > 0) {
      window.setTimeout(() => {
        store.pushFloating({
          kind: "points_pop",
          x: origin.x + 28,
          y: origin.y + 12,
          value: options.points!,
          label: "pts",
        });
        playFeedbackSound("reward");
      }, 100);
    }

    store.triggerScreenPulse("xp_gain");
    if (options.cardId) store.highlightCard(options.cardId);

    if (options.message) {
      toast({
        title: options.message,
        description:
          options.points && options.points > 0
            ? `+${options.xp} XP · +${options.points} pts`
            : `+${options.xp} XP`,
        variant: "success",
      });
    }
  },

  eventStart() {
    playFeedbackSound("event_start");
    useFeedbackStore.getState().triggerEventStart();
    toast({
      title: "Event is live!",
      description: "9 challenges unlocked — go get them.",
      variant: "success",
    });
  },

  highlightLeaderboardUser(userId: string) {
    useFeedbackStore.getState().setLeaderboardHighlight(userId);
  },
};
