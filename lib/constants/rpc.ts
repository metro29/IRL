/**
 * Supabase RPCs the app may invoke from server actions.
 * Do not call internal functions (award_xp_and_points, generate_event_challenges) from the client.
 */

/** User gameplay — instant challenge + attendance flows */
export const USER_GAME_RPCS = [
  "award_challenge_completion",
  "submit_event_attendance",
  "review_event_attendance",
] as const;

/** Admin / lifecycle — activate_event is the ONLY path that generates challenges */
export const ADMIN_GAME_RPCS = ["activate_event", "end_event"] as const;

/** Read-path sync — calls activate_event only; never generates challenges directly */
export const SYNC_GAME_RPCS = ["sync_group_event_statuses"] as const;

export type UserGameRpc = (typeof USER_GAME_RPCS)[number];
export type AdminGameRpc = (typeof ADMIN_GAME_RPCS)[number];
