import { createClient } from "@/lib/supabase/server";
import type { EventStatus, EventWithMeta } from "@/types/domain";

export interface EventRow {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  status: EventStatus;
  created_by: string;
  challenges_generated: boolean;
  created_at: string;
}

export async function syncGroupEventStatuses(groupId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("sync_group_event_statuses", { p_group_id: groupId });
}

export async function getGroupEvents(
  groupId: string,
  statusFilter?: EventStatus | "all"
): Promise<EventRow[]> {
  await syncGroupEventStatuses(groupId);

  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select("*")
    .eq("group_id", groupId)
    .order("start_time", { ascending: true });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function getEventById(eventId: string): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  await syncGroupEventStatuses(data.group_id);
  const { data: refreshed } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  return refreshed as EventRow;
}

export async function getEventWithMeta(
  eventId: string,
  userId: string
): Promise<EventWithMeta | null> {
  const event = await getEventById(eventId);
  if (!event) return null;

  const supabase = await createClient();

  const { count: rsvpCount } = await supabase
    .from("event_rsvps")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "going");

  const { data: rsvp } = await supabase
    .from("event_rsvps")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: attendance } = await supabase
    .from("event_attendance")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  const { isGroupAdmin } = await import("@/lib/db/permissions");
  const isAdmin = await isGroupAdmin(userId, event.group_id);

  return {
    ...event,
    rsvp_count: rsvpCount ?? 0,
    my_rsvp: rsvp as EventWithMeta["my_rsvp"],
    my_attendance: attendance as EventWithMeta["my_attendance"],
    is_admin: isAdmin,
  };
}

export async function getTodaysEventForGroup(
  groupId: string
): Promise<EventRow | null> {
  await syncGroupEventStatuses(groupId);
  const events = await getGroupEvents(groupId, "all");
  const now = new Date();
  const today = now.toDateString();

  const active = events.find((e) => e.status === "active");
  if (active) return active;

  return (
    events.find((e) => {
      const start = new Date(e.start_time);
      return (
        e.status === "scheduled" && start.toDateString() === today
      );
    }) ?? null
  );
}
