import { createClient } from "@/lib/supabase/server";
import {
  ACTIVITY_FEED_TYPE_PRIORITY,
  type ActivityFeedSourceType,
} from "@/lib/constants/engagement";
import type { ActivityFeedItem, ProfilePublic } from "@/types/domain";

function mapProfile(row: {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
  points: number;
  xp: number;
} | null): ProfilePublic | null {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    level: row.level,
    points: row.points,
    xp: row.xp,
  };
}

/** Cross-table dedupe: one feed row per logical action. */
function actionKey(kind: string, id: string): string {
  return `${kind}:${id}`;
}

type FeedCandidate = ActivityFeedItem & {
  source_type: ActivityFeedSourceType;
  source_id: string;
  _actionKey?: string;
};

function mergeCandidates(candidates: FeedCandidate[], limit: number): ActivityFeedItem[] {
  const seenActions = new Set<string>();
  const seenSources = new Set<string>();
  const merged: FeedCandidate[] = [];

  const sorted = [...candidates].sort((a, b) => {
    const time =
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (time !== 0) return time;
    return (
      ACTIVITY_FEED_TYPE_PRIORITY[a.source_type] -
      ACTIVITY_FEED_TYPE_PRIORITY[b.source_type]
    );
  });

  for (const item of sorted) {
    const sourceKey = `${item.source_type}:${item.source_id}`;
    if (seenSources.has(sourceKey)) continue;

    if (item._actionKey) {
      if (seenActions.has(item._actionKey)) continue;
      seenActions.add(item._actionKey);
    }

    seenSources.add(sourceKey);
    merged.push(item);
    if (merged.length >= limit) break;
  }

  return merged.map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip internal dedupe key
    const { _actionKey, ...rest } = item;
    return rest;
  });
}

export async function getGroupActivityFeed(
  groupId: string,
  limit = 30
): Promise<ActivityFeedItem[]> {
  const supabase = await createClient();
  const perSource = limit;

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  const memberIds = members?.map((m) => m.user_id) ?? [];

  const xpQuery =
    memberIds.length > 0
      ? supabase
          .from("xp_logs")
          .select(
            `id, created_at, user_id, amount, source_type, source_id,
        profiles:user_id (id, username, display_name, avatar_url, level, points, xp)`
          )
          .in("user_id", memberIds)
          .order("created_at", { ascending: false })
          .limit(perSource)
      : Promise.resolve({ data: [], error: null });

  const [xpRes, submissionsRes, attendanceRes, eventsRes] = await Promise.all([
    xpQuery,
    supabase
      .from("submissions")
      .select(
        `id, created_at, user_id, event_id, challenge_id,
        profiles:user_id (id, username, display_name, avatar_url, level, points, xp),
        challenges:challenge_id (title)`
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(perSource),
    supabase
      .from("event_attendance")
      .select(
        `id, created_at, reviewed_at, user_id, event_id, status,
        profiles:user_id (id, username, display_name, avatar_url, level, points, xp),
        events:event_id (title)`
      )
      .eq("group_id", groupId)
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false })
      .limit(perSource),
    supabase
      .from("events")
      .select(
        `id, title, created_at, created_by,
        profiles:created_by (id, username, display_name, avatar_url, level, points, xp)`
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(perSource),
  ]);

  const candidates: FeedCandidate[] = [];

  if (memberIds.length > 0 && !xpRes.error) {
    for (const row of xpRes.data ?? []) {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const user = mapProfile(profile as ProfilePublic | null);
      if (!user) continue;

      const sourceType = row.source_type as string;
      const sourceId = row.source_id as string;
      let dedupeKey: string | undefined;

      if (sourceType === "challenge") {
        dedupeKey = actionKey("challenge", sourceId);
      } else if (sourceType === "event") {
        dedupeKey = actionKey("attendance", sourceId);
      }

      candidates.push({
        id: `xp_log:${row.id}`,
        source_type: "xp_log",
        source_id: row.id as string,
        kind: "xp_gained",
        created_at: row.created_at as string,
        user,
        title: "XP gained",
        description: `${user.display_name} earned +${row.amount} XP`,
        href: "/dashboard",
        _actionKey: dedupeKey,
      });
    }
  }

  for (const row of submissionsRes.data ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const challenge = Array.isArray(row.challenges) ? row.challenges[0] : row.challenges;
    const user = mapProfile(profile as ProfilePublic | null);
    if (!user) continue;

    candidates.push({
      id: `submission:${row.id}`,
      source_type: "submission",
      source_id: row.id as string,
      kind: "challenge_completed",
      created_at: row.created_at as string,
      user,
      title: "Challenge completed",
      description: challenge?.title
        ? `${user.display_name} completed "${challenge.title}"`
        : `${user.display_name} completed a challenge`,
      href: `/events/${row.event_id}`,
      _actionKey: actionKey("challenge", row.id as string),
    });
  }

  for (const row of attendanceRes.data ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    const user = mapProfile(profile as ProfilePublic | null);
    if (!user) continue;
    const at = (row.reviewed_at ?? row.created_at) as string;

    candidates.push({
      id: `event_attendance:${row.id}`,
      source_type: "event_attendance",
      source_id: row.id as string,
      kind: "attendance_approved",
      created_at: at,
      user,
      title: "Event attendance",
      description: `${user.display_name} attended ${event?.title ?? "an event"}`,
      href: `/events/${row.event_id}`,
      _actionKey: actionKey("attendance", row.id as string),
    });
  }

  for (const row of eventsRes.data ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const user = mapProfile(profile as ProfilePublic | null);
    if (!user) continue;

    candidates.push({
      id: `event:${row.id}`,
      source_type: "event",
      source_id: row.id as string,
      kind: "event_created",
      created_at: row.created_at as string,
      user,
      title: "New event",
      description: `${user.display_name} scheduled "${row.title}"`,
      href: `/events/${row.id}`,
      _actionKey: actionKey("event_created", row.id as string),
    });
  }

  return mergeCandidates(candidates, limit);
}
