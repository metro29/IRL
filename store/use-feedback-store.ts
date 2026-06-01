import { create } from "zustand";
import type {
  FeedbackEffectType,
  FloatingReward,
  LevelUpPayload,
} from "@/lib/feedback/types";

interface FeedbackState {
  floatingRewards: FloatingReward[];
  screenPulse: FeedbackEffectType | null;
  highlightCardId: string | null;
  showLevelUpModal: boolean;
  levelUp: LevelUpPayload | null;
  showEventBanner: boolean;
  showGoLiveBurst: boolean;
  showChallengeSuccess: boolean;
  leaderboardHighlightUserId: string | null;

  pushFloating: (reward: Omit<FloatingReward, "id">) => void;
  dismissFloating: (id: string) => void;
  triggerScreenPulse: (type: FeedbackEffectType) => void;
  highlightCard: (cardId: string | null) => void;
  showLevelUp: (payload: LevelUpPayload) => void;
  hideLevelUp: () => void;
  triggerEventStart: () => void;
  hideEventBanner: () => void;
  triggerGoLiveBurst: () => void;
  triggerChallengeSuccess: () => void;
  setLeaderboardHighlight: (userId: string | null) => void;

  /** @deprecated use pushFloating via feedback.xpGain */
  pushXpPopup: (payload: { xp: number; points: number; message?: string }) => void;
  dismissXpPopup: (id: string) => void;
  triggerLevelUp: (level: number) => void;
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  floatingRewards: [],
  screenPulse: null,
  highlightCardId: null,
  showLevelUpModal: false,
  levelUp: null,
  showEventBanner: false,
  showGoLiveBurst: false,
  showChallengeSuccess: false,
  leaderboardHighlightUserId: null,

  pushFloating: (reward) =>
    set((s) => ({
      floatingRewards: [
        ...s.floatingRewards,
        { ...reward, id: crypto.randomUUID() },
      ],
    })),

  dismissFloating: (id) =>
    set((s) => ({
      floatingRewards: s.floatingRewards.filter((r) => r.id !== id),
    })),

  triggerScreenPulse: (type) => {
    set({ screenPulse: type });
    setTimeout(() => {
      if (get().screenPulse === type) set({ screenPulse: null });
    }, 320);
  },

  highlightCard: (cardId) => {
    set({ highlightCardId: cardId });
    if (cardId) {
      setTimeout(() => {
        if (get().highlightCardId === cardId) set({ highlightCardId: null });
      }, 1600);
    }
  },

  showLevelUp: (payload) => {
    set({ showLevelUpModal: true, levelUp: payload });
    setTimeout(() => set({ showLevelUpModal: false, levelUp: null }), 2800);
  },

  hideLevelUp: () => set({ showLevelUpModal: false, levelUp: null }),

  triggerEventStart: () => {
    set({ showEventBanner: true, showGoLiveBurst: true });
    setTimeout(() => set({ showGoLiveBurst: false }), 1400);
    setTimeout(() => set({ showEventBanner: false }), 5000);
  },

  hideEventBanner: () => set({ showEventBanner: false }),

  triggerGoLiveBurst: () => {
    set({ showGoLiveBurst: true });
    setTimeout(() => set({ showGoLiveBurst: false }), 1400);
  },

  triggerChallengeSuccess: () => {
    set({ showChallengeSuccess: true });
    setTimeout(() => set({ showChallengeSuccess: false }), 1000);
  },

  setLeaderboardHighlight: (userId) => {
    set({ leaderboardHighlightUserId: userId });
    if (userId) {
      setTimeout(() => {
        if (get().leaderboardHighlightUserId === userId) {
          set({ leaderboardHighlightUserId: null });
        }
      }, 2000);
    }
  },

  pushXpPopup: ({ xp, points }) => {
    const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 0;
    const cy = typeof window !== "undefined" ? window.innerHeight * 0.28 : 0;
    get().pushFloating({ kind: "xp_gain", x: cx, y: cy, value: xp, label: "XP" });
    if (points > 0) {
      setTimeout(() => {
        get().pushFloating({
          kind: "points_pop",
          x: cx + 24,
          y: cy + 8,
          value: points,
          label: "pts",
        });
      }, 120);
    }
    get().triggerScreenPulse("reward");
  },

  dismissXpPopup: (id) => get().dismissFloating(id),

  triggerLevelUp: (level) => {
    get().showLevelUp({
      level,
      xpInLevel: 0,
      xpForNextLevel: 100,
    });
  },
}));

/** Backward-compatible alias */
export const useGamificationStore = useFeedbackStore;
