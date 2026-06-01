export const NOTIFICATION_TYPES = [
  "friend_request",
  "friend_accept",
  "event_created",
  "event_live",
  "challenge_completed",
  "xp_awarded",
  "attendance_approved",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
