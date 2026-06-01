"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/db/profiles";
import { isGroupAdmin } from "@/lib/db/permissions";
import { getUserMembership } from "@/lib/db/groups";
import type { ActionResult } from "@/lib/actions/types";
import type { RsvpStatus } from "@/types/domain";

export async function createEventAction(input: {
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
}): Promise<ActionResult<{ eventId: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const membership = await getUserMembership(userId);
  if (!membership) {
    return { success: false, error: "Join a group before creating events." };
  }

  const isAdmin = await isGroupAdmin(userId, membership.group_id);
  if (!isAdmin) {
    return { success: false, error: "Only group admins can create events." };
  }

  const title = input.title.trim();
  if (title.length < 2) {
    return { success: false, error: "Title must be at least 2 characters." };
  }

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { success: false, error: "Invalid start or end time." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert([
      {
        group_id: membership.group_id,
        title,
        description: input.description?.trim() || null,
        location: input.location?.trim() || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: "scheduled",
        created_by: userId,
      },
    ])
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { success: true, data: { eventId: data.id } };
}

export async function updateEventAction(
  eventId: string,
  input: {
    title?: string;
    description?: string;
    location?: string;
    startTime?: string;
    endTime?: string;
  }
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const supabase = await createClient();
  const { data: event, error: fetchError } = await supabase
    .from("events")
    .select("group_id, status")
    .eq("id", eventId)
    .single();

  if (fetchError || !event) return { success: false, error: "Event not found." };
  if (event.status !== "scheduled") {
    return { success: false, error: "Only scheduled events can be edited." };
  }

  if (!(await isGroupAdmin(userId, event.group_id))) {
    return { success: false, error: "Only group admins can edit events." };
  }

  const payload: Record<string, string | null> = {};
  if (input.title) payload.title = input.title.trim();
  if (input.description !== undefined) payload.description = input.description.trim() || null;
  if (input.location !== undefined) payload.location = input.location.trim() || null;
  if (input.startTime) payload.start_time = new Date(input.startTime).toISOString();
  if (input.endTime) payload.end_time = new Date(input.endTime).toISOString();

  const { error } = await supabase.from("events").update(payload).eq("id", eventId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return { success: true, data: undefined };
}

export async function deleteEventAction(eventId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("group_id")
    .eq("id", eventId)
    .single();

  if (!event) return { success: false, error: "Event not found." };
  if (!(await isGroupAdmin(userId, event.group_id))) {
    return { success: false, error: "Only group admins can delete events." };
  }

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function activateEventAction(eventId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("activate_event", { p_event_id: eventId });
  if (error) return { success: false, error: error.message };

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  return { success: true, data: undefined };
}

export async function endEventAction(eventId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("end_event", { p_event_id: eventId });
  if (error) return { success: false, error: error.message };

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function rsvpEventAction(
  eventId: string,
  status: RsvpStatus
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const supabase = await createClient();
  const { error } = await supabase.from("event_rsvps").upsert(
    {
      event_id: eventId,
      user_id: userId,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "event_id,user_id" }
  );

  if (error) return { success: false, error: error.message };

  revalidatePath(`/events/${eventId}`);
  return { success: true, data: undefined };
}
