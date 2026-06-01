"use client";

import { useEffect } from "react";
import { useFeedbackStore } from "@/store/use-feedback-store";

/** Applies glow to elements with data-fx-card-id matching highlight. */
export function CardHighlightProvider() {
  const cardId = useFeedbackStore((s) => s.highlightCardId);

  useEffect(() => {
    document.querySelectorAll("[data-fx-card-id]").forEach((el) => {
      el.classList.remove("fx-card-glow");
    });
    if (!cardId) return;
    const el = document.querySelector(`[data-fx-card-id="${cardId}"]`);
    el?.classList.add("fx-card-glow");
    return () => el?.classList.remove("fx-card-glow");
  }, [cardId]);

  return null;
}
