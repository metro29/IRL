import { notFound, redirect } from "next/navigation";
import { getCurrentUserId, getCurrentUserProfile } from "@/lib/db/profiles";
import { isGroupMember } from "@/lib/db/groups";
import { getEventWithMeta } from "@/lib/db/events";
import { getChallengesForEvent } from "@/lib/db/challenges";
import { isGroupAdmin } from "@/lib/db/permissions";
import { createClient } from "@/lib/supabase/server";
import { EventDetailClient } from "@/components/features/events/event-detail-client";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const event = await getEventWithMeta(id, userId);
  if (!event) notFound();

  const member = await isGroupMember(event.group_id, userId);
  if (!member) notFound();

  const challenges =
    event.status === "active"
      ? await getChallengesForEvent(id, userId)
      : [];

  let pendingAttendance: Array<{
    id: string;
    event_id: string;
    photo_url: string;
    profile: { display_name: string; username: string };
  }> = [];

  if (await isGroupAdmin(userId, event.group_id)) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("event_attendance")
      .select("id, event_id, photo_url, user_id")
      .eq("group_id", event.group_id)
      .eq("status", "pending");

    if (data?.length) {
      const userIds = data.map((d) => d.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      pendingAttendance = data.map((row) => ({
        id: row.id,
        event_id: row.event_id,
        photo_url: row.photo_url,
        profile: profileMap.get(row.user_id) ?? {
          display_name: "Unknown",
          username: "unknown",
        },
      }));
    }
  }

  const profile = await getCurrentUserProfile();

  return (
    <EventDetailClient
      event={event}
      challenges={challenges}
      currentUserId={userId}
      currentUserLevel={profile?.level ?? 1}
      pendingAttendance={pendingAttendance}
    />
  );
}
