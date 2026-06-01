"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Flame, Sparkles, Star, Target, Trophy, Zap } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { SectionHeading } from "@/components/shared/section-heading";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { StatCard } from "@/components/shared/stat-card";
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
import { UI_CARD, UI_CARD_INTERACTIVE, UI_PAGE_SECTION, UI_SECTION } from "@/lib/constants/ui";

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
  const displayName = profile?.display_name ?? "there";

  const hero = (
    <div className="irl-hero mb-2">
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Dashboard
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            Hey, {displayName}
          </h2>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Your crew, today&apos;s event, and where you rank — all in one place.
          </p>
        </div>
        <Button asChild size="sm" variant="secondary" className="shrink-0">
          <Link href="/leaderboard">
            <Trophy className="mr-2 h-4 w-4" />
            Leaderboard
          </Link>
        </Button>
      </div>
    </div>
  );

  return (
    <div className={UI_PAGE_SECTION}>
      <PageShell
        title="Overview"
        description="Stats update live as you complete challenges and show up to events."
        status="ready"
        hero={hero}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Level"
            value={profile?.level ?? 1}
            hint={`${profile?.xp ?? 0} XP total`}
            icon={Star}
            accent="primary"
          />
          <StatCard
            label="Points"
            value={profile?.points ?? 0}
            hint="Leaderboard score"
            icon={Trophy}
            accent="warm"
          />
          <StatCard
            label="Streak"
            value={profile?.streak ?? 0}
            hint="Days active"
            icon={Flame}
            accent="default"
          />
        </div>
      </PageShell>

      <section className={UI_SECTION}>
        <SectionHeading icon={<Calendar className="h-4 w-4" />}>
          Today&apos;s event
        </SectionHeading>
        {todaysEvent ? (
          <Card className={`${UI_CARD_INTERACTIVE} border-primary/25`}>
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
            icon={<Calendar className="h-7 w-7" />}
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/events">Browse events</Link>
              </Button>
            }
          />
        )}
      </section>

      <section className={UI_SECTION}>
        <SectionHeading icon={<Target className="h-4 w-4" />}>
          Active challenges
        </SectionHeading>
        {quickChallenges.length === 0 ? (
          <EmptyPanel
            title="No live challenges"
            description="When an event goes live, challenges unlock here instantly."
            icon={<Target className="h-7 w-7" />}
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
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5 md:p-6">
                  <div>
                    <p className="font-display font-semibold">{c.title}</p>
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

      <div className="irl-hero flex flex-wrap items-center justify-between gap-4 !p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Zap className="h-5 w-5" />
          </span>
          <span className="font-display font-semibold">Quick tip</span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Challenge completions are instant — attendance needs admin approval.
        </p>
      </div>
    </div>
  );
}
