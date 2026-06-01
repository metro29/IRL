"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { EventCard } from "@/components/features/events/event-card";
import { PageShell } from "@/components/shared/page-shell";
import { CreateEventDialog } from "@/components/features/events/create-event-dialog";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { UI_PAGE_SECTION } from "@/lib/constants/ui";
import { Button } from "@/components/ui/button";
import type { EventRow } from "@/lib/db/events";
import type { EventStatus } from "@/types/domain";

interface EventsPageClientProps {
  events: EventRow[];
  isAdmin: boolean;
  hasGroup: boolean;
}

const filters: { key: EventStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "scheduled", label: "Scheduled" },
  { key: "active", label: "Active" },
  { key: "ended", label: "Ended" },
];

export function EventsPageClient({
  events: initialEvents,
  isAdmin,
  hasGroup,
}: EventsPageClientProps) {
  const [filter, setFilter] = useState<EventStatus | "all">("all");

  const events =
    filter === "all"
      ? initialEvents
      : initialEvents.filter((e) => e.status === filter);

  if (!hasGroup) {
    return (
      <PageShell
        title="Events"
        description="Real-world meetups unlock challenges and XP."
        status="empty"
        emptyTitle="Join a group first"
        emptyDescription="Events belong to your group. Create or join a group to get started."
        emptyIcon={<Calendar className="h-10 w-10 text-primary/60" />}
      />
    );
  }

  return (
    <div className={UI_PAGE_SECTION}>
      <PageShell
        title="Events"
        description="Schedule meetups, go live, and unlock challenges."
        status="ready"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? "default" : "outline"}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          {isAdmin ? <CreateEventDialog /> : null}
        </div>
      </PageShell>

      {events.length === 0 ? (
        <EmptyPanel
          title={
            filter === "all" ? "No events yet" : `No ${filter} events`
          }
          description={
            isAdmin
              ? "Create an event to schedule your next meetup and unlock the game loop."
              : "Your group admins can schedule events — check back soon."
          }
          icon={<Calendar className="h-6 w-6 text-primary" />}
          action={isAdmin ? <CreateEventDialog /> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
