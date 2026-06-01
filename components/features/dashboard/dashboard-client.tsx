"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Target, Zap } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { SectionHeading } from "@/components/shared/section-heading";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { EventStatusBadge } from "@/components/features/events/event-status-badge";
import { ChallengeSubmitDialog } from "@/components/features/challenges/challenge-submit-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EventRow } from "@/lib/db/events";
import type { ChallengeWithCompletion } from "@/types/domain";
import type { Profile } from "@/types/database";
import { useRealtimeProfile } from "@/hooks/use-realtime-leaderboard";
import { ActivityFeedPanel } from "@/components/features/feed/activity-feed-panel";
import type { ActivityFeedItem } from "@/types/domain";
import { UI_CARD, UI_PAGE_SECTION, UI_SECTION } from "@/lib/constants/ui";

interface DashboardClientProps {
  profile: Profile | null;
  todaysEvent: EventRow | null;
  activeChallenges: ChallengeWithCompletion[];
  currentUserId: string;
  groupId: string | null;
  activityFeed: ActivityFeedItem[];
  memberUserIds: string[];
}

export function DashboardClient({
  profile,
  todaysEvent,
  activeChallenges,
  currentUserId,
  groupId,
  activityFeed,
  memberUserIds,
}: DashboardClientProps) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  useRealtimeProfile(currentUserId, refresh);

  const quickChallenges = activeChallenges.slice(0, 3);

  return (
    <div className={UI_PAGE_SECTION}>
      <PageShell
        title={`Hey, ${profile?.display_name ?? "there"}`}
        description="Your crew, today's event, and where you rank."
        status="ready"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className={UI_CARD}>
            <CardHeader className="pb-2">
              <CardDescription>Level</CardDescription>
              <CardTitle className="text-2xl">{profile?.level ?? 1}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {profile?.xp ?? 0} XP total
            </CardContent>
          </Card>
          <Card className={UI_CARD}>
            <CardHeader className="pb-2">
              <CardDescription>Points</CardDescription>
              <CardTitle className="text-2xl">{profile?.points ?? 0}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Leaderboard score
            </CardContent>
          </Card>
          <Card className={UI_CARD}>
            <CardHeader className="pb-2">
              <CardDescription>Streak</CardDescription>
              <CardTitle className="text-2xl">{profile?.streak ?? 0}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Days active</CardContent>
          </Card>
        </div>
      </PageShell>

      <section className={UI_SECTION}>
        <SectionHeading icon={<Calendar className="h-5 w-5" />}>
          Today&apos;s event
        </SectionHeading>
        {todaysEvent ? (
          <Card className={`${UI_CARD} border-primary/30`}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{todaysEvent.title}</CardTitle>
                <EventStatusBadge status={todaysEvent.status} pulse />
              </div>
              <CardDescription>
                {new Date(todaysEvent.start_time).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={`/events/${todaysEvent.id}`}>Open event</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <EmptyPanel
            title="No event today"
            description="Check back later or browse scheduled events with your group."
            icon={<Calendar className="h-6 w-6 text-primary" />}
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/events">Browse events</Link>
              </Button>
            }
          />
        )}
      </section>

      <section className={UI_SECTION}>
        <SectionHeading icon={<Target className="h-5 w-5" />}>
          Active challenges
        </SectionHeading>
        {quickChallenges.length === 0 ? (
          <EmptyPanel
            title="No live challenges"
            description="When an event goes live, challenges unlock here instantly."
            icon={<Target className="h-6 w-6 text-primary" />}
            action={
              groupId ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/events">View events</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3">
            {quickChallenges.map((c) => (
              <Card key={c.id} className={UI_CARD}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-sm text-muted-foreground">
                      +{c.xp_value} XP · +{c.points_value} pts
                    </p>
                  </div>
                  <ChallengeSubmitDialog
                    challenge={c}
                    userId={currentUserId}
                    currentLevel={profile?.level ?? 1}
                    compact
                  />
                </CardContent>
              </Card>
            ))}
            {activeChallenges.length > 3 ? (
              <Button variant="outline" asChild>
                <Link href={todaysEvent ? `/events/${todaysEvent.id}` : "/events"}>
                  View all {activeChallenges.length} challenges
                </Link>
              </Button>
            ) : null}
          </div>
        )}
      </section>

      <ActivityFeedPanel
        groupId={groupId}
        memberUserIds={memberUserIds}
        initialItems={activityFeed}
      />

      <Card className={`${UI_CARD} bg-gradient-to-r from-violet-50 to-fuchsia-50`}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold">Quick tip</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Challenge completions are instant — attendance needs admin approval.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
