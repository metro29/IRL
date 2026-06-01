"use client";

import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

const LEADERBOARD_REFRESH_MS = 500;

export function useRealtimeLeaderboard(
  groupId: string | null,
  memberUserIds: string[],
  onRefresh: () => void
) {
  const refresh = useCallback(onRefresh, [onRefresh]);
  const debouncedRefresh = useDebouncedCallback(refresh, LEADERBOARD_REFRESH_MS);
  const memberSet = useCallback(
    () => new Set(memberUserIds),
    [memberUserIds]
  );

  useEffect(() => {
    if (!groupId || memberUserIds.length === 0) return;

    const supabase = createClient();
    const members = memberSet();

    const channel = supabase
      .channel(`leaderboard:${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "xp_logs" },
        (payload) => {
          const userId = (payload.new as { user_id?: string }).user_id;
          if (userId && members.has(userId)) {
            debouncedRefresh();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [groupId, memberUserIds, memberSet, debouncedRefresh]);
}

export function useRealtimeEvent(
  eventId: string,
  groupId: string,
  onRefresh: () => void
) {
  const refresh = useCallback(onRefresh, [onRefresh]);
  const debouncedRefresh = useDebouncedCallback(refresh, LEADERBOARD_REFRESH_MS);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        () => debouncedRefresh()
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "challenges",
          filter: `event_id=eq.${eventId}`,
        },
        () => debouncedRefresh()
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "submissions",
          filter: `event_id=eq.${eventId}`,
        },
        () => debouncedRefresh()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "event_attendance",
          filter: `event_id=eq.${eventId}`,
        },
        () => debouncedRefresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, groupId, debouncedRefresh]);
}

export function useRealtimeProfile(
  userId: string | null,
  onRefresh: () => void
) {
  const refresh = useCallback(onRefresh, [onRefresh]);
  const debouncedRefresh = useDebouncedCallback(refresh, LEADERBOARD_REFRESH_MS);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "xp_logs",
          filter: `user_id=eq.${userId}`,
        },
        () => debouncedRefresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, debouncedRefresh]);
}
