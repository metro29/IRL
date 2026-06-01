/**
 * Notifications: database triggers are the ONLY insert path.
 * create_notification() is an internal helper — not exposed to clients.
 */
export const NOTIFICATION_SOURCE = "database_triggers_only" as const;

/** Activity feed row identity: source_type + source_id must be unique in the merged feed. */
export const ACTIVITY_FEED_SOURCE_TYPES = [
  "xp_log",
  "submission",
  "event_attendance",
  "event",
] as const;

export type ActivityFeedSourceType = (typeof ACTIVITY_FEED_SOURCE_TYPES)[number];

/** Sort tie-break when created_at is equal (lower = higher priority). */
export const ACTIVITY_FEED_TYPE_PRIORITY: Record<ActivityFeedSourceType, number> = {
  xp_log: 0,
  submission: 1,
  event_attendance: 2,
  event: 3,
};
