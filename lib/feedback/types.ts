export type FeedbackEffectType =
  | "success"
  | "error"
  | "info"
  | "reward"
  | "level_up"
  | "xp_gain"
  | "event_start";

export interface FeedbackOrigin {
  x: number;
  y: number;
}

export interface FloatingReward {
  id: string;
  kind: "xp_gain" | "points_pop";
  x: number;
  y: number;
  value: number;
  label?: string;
}

export interface LevelUpPayload {
  level: number;
  xpInLevel: number;
  xpForNextLevel: number;
}
