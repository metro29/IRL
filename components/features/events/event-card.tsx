"use client";

import { useTransition } from "react";
import Link from "next/link";
import { MapPin, Play, Square } from "lucide-react";
import { DeleteEventButton } from "@/components/features/events/delete-event-button";
import { EventStatusBadge } from "@/components/features/events/event-status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { activateEventAction, endEventAction } from "@/lib/actions/events";
import { feedback } from "@/lib/feedback/feedback";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { EventRow } from "@/lib/db/events";

interface EventCardProps {
  event: EventRow;
  isAdmin: boolean;
}

export function EventCard({ event, isAdmin }: EventCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ success: boolean; error?: string }>, goLive?: boolean) => {
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        feedback.error("Failed", result.error);
        return;
      }
      if (goLive) feedback.eventStart();
      else feedback.success("Event ended", "This event has been closed.");
      router.refresh();
    });
  };

  return (
    <Card
      data-fx-card-id={event.id}
      className={cn(
        "flex h-full flex-col",
        event.status === "active" && "border-primary/40 shadow-md shadow-primary/5"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{event.title}</CardTitle>
          <EventStatusBadge status={event.status} pulse={event.status === "active"} />
        </div>
        <CardDescription>
          {new Date(event.start_time).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        {event.location ? (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {event.location}
          </p>
        ) : null}
        {event.challenges_generated ? (
          <p className="text-sm font-medium text-primary">Challenges unlocked</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/events/${event.id}`}>View</Link>
          </Button>
          {isAdmin && event.status === "scheduled" ? (
            <Button
              size="sm"
              className="gap-1"
              disabled={pending}
              onClick={() => run(() => activateEventAction(event.id), true)}
            >
              <Play className="h-3.5 w-3.5" />
              Go Live
            </Button>
          ) : null}
          {isAdmin && event.status === "active" ? (
            <Button
              size="sm"
              variant="secondary"
              className="gap-1"
              disabled={pending}
              onClick={() => run(() => endEventAction(event.id))}
            >
              <Square className="h-3.5 w-3.5" />
              End
            </Button>
          ) : null}
          {isAdmin ? (
            <DeleteEventButton eventId={event.id} eventTitle={event.title} />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
