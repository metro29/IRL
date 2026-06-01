import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/db/profiles";
import { getCurrentUserGroup } from "@/lib/db/groups";
import { isGroupAdmin } from "@/lib/db/permissions";
import { getGroupEvents } from "@/lib/db/events";
import { EventsPageClient } from "@/components/features/events/events-page-client";
import { PageShell } from "@/components/shared/page-shell";
import { safePageLoad } from "@/lib/server/safe-page";

export default async function EventsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const group = await getCurrentUserGroup();
  if (!group) {
    return <EventsPageClient events={[]} isAdmin={false} hasGroup={false} />;
  }

  const result = await safePageLoad(async () => {
    const [events, isAdmin] = await Promise.all([
      getGroupEvents(group.id, "all"),
      isGroupAdmin(userId, group.id),
    ]);
    return { events, isAdmin };
  });

  if (result.error || !result.data) {
    return (
      <PageShell
        title="Events"
        description="Schedule meetups and go live."
        status="error"
        errorMessage={result.error ?? "Failed to load events."}
      />
    );
  }

  return (
    <EventsPageClient
      events={result.data.events}
      isAdmin={result.data.isAdmin}
      hasGroup={true}
    />
  );
}
