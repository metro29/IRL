"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/use-app-store";
import type { NotificationRow } from "@/types/domain";

function mapNotificationRow(raw: Record<string, unknown>): NotificationRow {
  return {
    id: raw.id as string,
    user_id: raw.user_id as string,
    type: raw.type as NotificationRow["type"],
    title: raw.title as string,
    body: raw.body as string,
    read: Boolean(raw.read),
    metadata: (raw.metadata ?? {}) as Record<string, unknown>,
    created_at: raw.created_at as string,
  };
}

export function useNotifications(
  userId: string | null,
  initialNotifications: NotificationRow[],
  initialUnreadCount: number
) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const setNotificationCount = useAppStore((s) => s.setNotificationCount);
  const hydratedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    if (hydratedUserRef.current !== userId) {
      hydratedUserRef.current = userId;
      setNotifications(initialNotifications);
      setNotificationCount(initialUnreadCount);
    }
  }, [userId, initialNotifications, initialUnreadCount, setNotificationCount]);

  const refreshUnread = useCallback(
    (list: NotificationRow[]) => {
      setNotificationCount(list.filter((n) => !n.read).length);
    },
    [setNotificationCount]
  );

  const appendNotification = useCallback(
    (row: NotificationRow) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === row.id)) return prev;
        const next = [row, ...prev].slice(0, 40);
        refreshUnread(next);
        return next;
      });
    },
    [refreshUnread]
  );

  const markReadLocal = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        refreshUnread(next);
        return next;
      });
    },
    [refreshUnread]
  );

  const markAllReadLocal = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      setNotificationCount(0);
      return next;
    });
  }, [setNotificationCount]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          appendNotification(mapNotificationRow(payload.new as Record<string, unknown>));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, appendNotification]);

  return {
    notifications,
    markReadLocal,
    markAllReadLocal,
  };
}
