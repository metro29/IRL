"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications";
import { useNotifications } from "@/hooks/use-notifications";
import { useAppStore } from "@/store/use-app-store";
import { feedback } from "@/lib/feedback/feedback";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "@/types/domain";

interface NotificationsBellProps {
  userId: string | null;
  initialNotifications: NotificationRow[];
  initialUnreadCount: number;
}

function notificationHref(n: NotificationRow): string | null {
  const m = n.metadata;
  if (n.type === "friend_request") return "/friends";
  if (n.type === "friend_accept") return "/friends";
  if (m.event_id && typeof m.event_id === "string") return `/events/${m.event_id}`;
  if (m.group_id && typeof m.group_id === "string") return `/groups/${m.group_id}`;
  return null;
}

export function NotificationsBell({
  userId,
  initialNotifications,
  initialUnreadCount,
}: NotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const [badgePulse, setBadgePulse] = useState(false);
  const notificationCount = useAppStore((s) => s.notificationCount);
  const prevCountRef = useRef(initialUnreadCount);
  const { notifications, markReadLocal, markAllReadLocal } = useNotifications(
    userId,
    initialNotifications,
    initialUnreadCount
  );

  useEffect(() => {
    if (notificationCount > prevCountRef.current) {
      setBadgePulse(true);
      const t = setTimeout(() => setBadgePulse(false), 500);
      return () => clearTimeout(t);
    }
    prevCountRef.current = notificationCount;
  }, [notificationCount]);

  const handleMarkRead = async (id: string) => {
    markReadLocal(id);
    const result = await markNotificationReadAction(id);
    if (!result.success) feedback.error("Could not update", result.error);
  };

  const handleMarkAll = async () => {
    markAllReadLocal();
    const result = await markAllNotificationsReadAction();
    if (result.success) feedback.success("All caught up", "Notifications marked as read.");
    else feedback.error("Could not update", result.error);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 ? (
            <span
              className={cn(
                "absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground",
                badgePulse && "animate-badge-pulse"
              )}
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-h-[min(400px,70vh)] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-2 py-1.5">
          <p className="text-sm font-semibold">Notifications</p>
          {notificationCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => void handleMarkAll()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">You&apos;re all caught up</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Friend requests, events, and XP will show up here.
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const href = notificationHref(n);
            const content = (
              <>
                <p className="font-medium leading-tight">{n.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </>
            );

            return (
              <DropdownMenuItem
                key={n.id}
                className={cn(
                  "animate-notification-in flex cursor-pointer flex-col items-start gap-0.5 py-2",
                  !n.read && "bg-accent/50"
                )}
                onClick={() => {
                  if (!n.read) void handleMarkRead(n.id);
                  setOpen(false);
                }}
                asChild={!!href}
              >
                {href ? (
                  <Link href={href} className="w-full">
                    {content}
                  </Link>
                ) : (
                  <div className="w-full">{content}</div>
                )}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
