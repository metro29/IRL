export const XP_PER_LEVEL = 100;

export const TIER_XP: Record<1 | 3 | 5 | 10, number> = {
  1: 20,
  3: 50,
  5: 100,
  10: 200,
};

export const TIER_POINTS: Record<1 | 3 | 5 | 10, number> = {
  1: 1,
  3: 3,
  5: 5,
  10: 10,
};

export const EVENT_ATTENDANCE_XP = 25;

/** Level is computed only in Postgres via award_xp_and_points → xp_to_level(). Do not recalculate client-side. */
