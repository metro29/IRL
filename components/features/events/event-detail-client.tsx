"use client";

import { useCallback, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Play, Square } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { EventStatusBadge } from "@/components/features/events/event-status-badge";
import { AttendanceUploadDialog } from "@/components/features/events/attendance-upload-dialog";
import { ChallengeSubmitDialog } from "@/components/features/challenges/challenge-submit-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  activateEventAction,
  endEventAction,
  rsvpEventAction,
} from "@/lib/actions/events";
import { reviewAttendanceAction } from "@/lib/actions/game";
import { feedback } from "@/lib/feedback/feedback";
import { useRouter } from "next/navigation";
import { useRealtimeEvent } from "@/hooks/use-realtime-leaderboard";
import { UI_CARD } from "@/lib/constants/ui";
import { cn } from "@/lib/utils";
import type { ChallengeWithCompletion, EventWithMeta } from "@/types/domain";

interface PendingAttendance {
  id: string;
  event_id: string;
  photo_url: string;
  profile: { display_name: string; username: string };
}

interface EventDetailClientProps {
  event: EventWithMeta;
  challenges: ChallengeWithCompletion[];
  currentUserId: string;
  currentUserLevel: number;
  pendingAttendance: PendingAttendance[];
}

export function EventDetailClient({
  event,
  challenges,
  currentUserId,
  currentUserLevel,
  pendingAttendance,
}: EventDetailClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const refresh = useCallback(() => router.refresh(), [router]);
  useRealtimeEvent(event.id, event.group_id, refresh);

  const runAdmin = (
    action: () => Promise<{ success: boolean; error?: string }>,
    options?: { goLive?: boolean }
  ) => {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        feedback.error("Failed", result.error);
        return;
      }
      if (options?.goLive) feedback.eventStart();
      else feedback.success("Event updated");
      router.refresh();
    });
  };

  const tierLabel = (tier: number) => {
    if (tier === 1) return "Easy";
    if (tier === 3) return "Medium";
    if (tier === 5) return "Hard";
    return "Legendary";
  };

  return (
    <div className="animate-fade-in space-y-8">
      <PageShell title={event.title} description={event.description ?? undefined} status="ready">
        <Card
          className={cn(
            UI_CARD,
            event.status === "active" && "border-primary/50 shadow-lg shadow-primary/10"
          )}
        >
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <EventStatusBadge status={event.status} pulse={event.status === "active"} />
              <span className="text-sm text-muted-foreground">
                {new Date(event.start_time).toLocaleString()} –{" "}
                {new Date(event.end_time).toLocaleString()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.location ? (
              <p className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                {event.location}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={event.my_rsvp?.status === "going" ? "default" : "outline"}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await rsvpEventAction(event.id, "going");
                    if (!r.success) feedback.error("RSVP failed", r.error);
                    else {
                      feedback.success("RSVP saved");
                      router.refresh();
                    }
                  })
                }
              >
                Going ({event.rsvp_count})
              </Button>
              <Button
                size="sm"
                variant={event.my_rsvp?.status === "maybe" ? "default" : "outline"}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await rsvpEventAction(event.id, "maybe");
                    router.refresh();
                  })
                }
              >
                Maybe
              </Button>
            </div>
            {(event.status === "active" || event.status === "ended") && (
              <AttendanceUploadDialog
                eventId={event.id}
                userId={currentUserId}
                existingStatus={event.my_attendance?.status ?? null}
              />
            )}
            {event.is_admin ? (
              <div className="flex flex-wrap gap-2 border-t pt-4">
                {event.status === "scheduled" ? (
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={pending}
                    onClick={() =>
                      runAdmin(() => activateEventAction(event.id), { goLive: true })
                    }
                  >
                    <Play className="h-4 w-4" />
                    Go Live
                  </Button>
                ) : null}
                {event.status === "active" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={pending}
                    onClick={() => runAdmin(() => endEventAction(event.id))}
                  >
                    <Square className="h-4 w-4" />
                    End Event
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </PageShell>

      {event.is_admin && pendingAttendance.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Pending attendance</h2>
          {pendingAttendance
            .filter((a) => a.event_id === event.id)
            .map((a) => (
              <Card key={a.id} className="rounded-xl">
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                    <Image src={a.photo_url} alt="" fill className="object-cover" unoptimized />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{a.profile.display_name}</p>
                    <p className="text-sm text-muted-foreground">@{a.profile.username}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await reviewAttendanceAction(a.id, true);
                          if (!r.success) feedback.error("Failed", r.error);
                          else {
                            feedback.xpGain({
                              xp: 25,
                              points: 0,
                              message: "Attendance approved!",
                            });
                            router.refresh();
                          }
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await reviewAttendanceAction(a.id, false);
                          router.refresh();
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Challenges</h2>
        {event.status !== "active" ? (
          <p className="text-sm text-muted-foreground">
            Challenges unlock when this event is <strong>live</strong>.
          </p>
        ) : challenges.length === 0 ? (
          <p className="text-sm text-muted-foreground">Generating challenges… refresh in a moment.</p>
        ) : (
          <div className="grid gap-3">
            {challenges.map((c, index) => (
              <Card
                key={c.id}
                data-fx-card-id={c.id}
                className={cn(UI_CARD, "animate-fx-stagger-in")}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{tierLabel(c.tier)}</Badge>
                      <Badge variant="secondary">
                        {c.points_value} pt · {c.xp_value} XP
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>{c.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChallengeSubmitDialog
                    challenge={c}
                    userId={currentUserId}
                    currentLevel={currentUserLevel}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Button variant="ghost" asChild>
        <Link href="/events">← Back to events</Link>
      </Button>
    </div>
  );
}
