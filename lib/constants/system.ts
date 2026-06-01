/**
 * Single source of truth per core feature (do not add parallel paths).
 */
export const SYSTEM_SOURCES = {
  xp: "award_challenge_completion → award_xp_and_points (internal)",
  events: "activate_event → generate_event_challenges (internal)",
  notifications: "database triggers → create_notification (internal)",
  chat: "group_messages table (RLS member insert)",
  submissions: "award_challenge_completion | submit_event_attendance | review_event_attendance",
} as const;
