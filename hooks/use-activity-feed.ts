"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ActivityFeedItem } from "@/types/domain";

const REFRESH_DEBOUNCE_MS = 450;

export function useActivityFeed(
  groupId: string | null,
  memberUserIds: string[],
  initialItems: ActivityFeedItem[],
  onRefresh: () => void
) {
  const [items, setItems] = useState(initialItems);
  const hydratedGroupRef = useRef<string | null>(null);
  const refresh = useCallback(onRefresh, [onRefresh]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hydratedGroupRef.current !== groupId) {
      hydratedGroupRef.current = groupId;
      setItems(initialItems);
    }
  }, [groupId, initialItems]);

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      refresh();
    }, REFRESH_DEBOUNCE_MS);
  }, [refresh]);

  useEffect(() => {
    if (!groupId || memberUserIds.length === 0) return;

    const supabase = createClient();
    const members = new Set(memberUserIds);

    const channel = supabase
      .channel(`activity:${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "xp_logs" },
        (payload) => {
          const userId = (payload.new as { user_id?: string }).user_id;
          if (userId && members.has(userId)) scheduleRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        () => scheduleRefresh()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "event_attendance",
        },
        () => scheduleRefresh()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        () => scheduleRefresh()
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, [groupId, memberUserIds, scheduleRefresh]);

  return items;
}
