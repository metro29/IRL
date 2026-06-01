"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Sparkles,
  Target,
  UserCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UI_CARD } from "@/lib/constants/ui";
import { useActivityFeed } from "@/hooks/use-activity-feed";
import { cn } from "@/lib/utils";
import type { ActivityFeedItem, ActivityFeedKind } from "@/types/domain";

const kindIcon: Record<ActivityFeedKind, typeof Target> = {
  challenge_completed: Target,
  attendance_approved: UserCheck,
  xp_gained: Sparkles,
  event_created: CalendarPlus,
};

interface ActivityFeedPanelProps {
  groupId: string | null;
  memberUserIds: string[];
  initialItems: ActivityFeedItem[];
}

export function ActivityFeedPanel({
  groupId,
  memberUserIds,
  initialItems,
}: ActivityFeedPanelProps) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  const items = useActivityFeed(groupId, memberUserIds, initialItems, refresh);

  if (!groupId) {
    return (
      <EmptyPanel
        title="No group activity yet"
        description="Join a group to see live updates when friends complete challenges and earn XP."
        icon={<CheckCircle2 className="h-6 w-6 text-primary" />}
      />
    );
  }

  return (
    <Card className={UI_CARD}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Group activity
        </CardTitle>
        <CardDescription>Live updates from challenges, events, and XP</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <EmptyPanel
            title="Quiet for now"
            description="When someone completes a challenge, attends an event, or earns XP, it will show up here live."
            icon={<CheckCircle2 className="h-6 w-6 text-primary" />}
            className="border-0 shadow-none"
          />
        ) : (
          items.map((item) => (
            <ActivityRow
              key={`${item.source_type}:${item.source_id}`}
              item={item}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ActivityRow({ item }: { item: ActivityFeedItem }) {
  const Icon = kindIcon[item.kind];
  const initials = item.user.display_name.slice(0, 2).toUpperCase();
  const inner = (
    <div
      className={cn(
        "animate-leaderboard-slide flex items-start gap-3 rounded-xl border bg-background/80 p-3 transition-colors",
        item.href && "hover:bg-accent/40"
      )}
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={item.user.avatar_url ?? undefined} alt="" />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-sm font-medium">{item.title}</p>
        </div>
        <p className="text-sm text-muted-foreground">{item.description}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {new Date(item.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}
