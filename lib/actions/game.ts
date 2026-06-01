"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/db/profiles";
import { isGroupAdmin } from "@/lib/db/permissions";
import type { ActionResult } from "@/lib/actions/types";

export interface ChallengeCompletionResult {
  submissionId: string;
  xpAwarded: number;
  pointsAwarded: number;
  newXp: number;
  newPoints: number;
  newLevel: number;
}

export async function awardChallengeCompletionAction(
  challengeId: string,
  photoUrl: string,
  caption?: string
): Promise<ActionResult<ChallengeCompletionResult>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  if (!photoUrl?.trim()) {
    return { success: false, error: "Photo proof is required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("award_challenge_completion", {
    p_user_id: userId,
    p_challenge_id: challengeId,
    p_photo_url: photoUrl.trim(),
    p_caption: caption?.trim() || null,
  });

  if (error) {
    const msg = error.message.includes("already completed")
      ? "You already completed this challenge."
      : error.message.includes("active")
        ? "Challenges unlock when the event is active."
        : error.message.includes("Forbidden")
          ? "Not authorized."
          : error.message;
    return { success: false, error: msg };
  }

  const result = data as Record<string, unknown>;
  const eventId = await getChallengeEventId(challengeId);

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");

  return {
    success: true,
    data: {
      submissionId: String(result.submission_id),
      xpAwarded: Number(result.xp_awarded),
      pointsAwarded: Number(result.points_awarded),
      newXp: Number(result.new_xp),
      newPoints: Number(result.new_points),
      newLevel: Number(result.new_level),
    },
  };
}

async function getChallengeEventId(challengeId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("challenges")
    .select("event_id")
    .eq("id", challengeId)
    .single();
  return data?.event_id ?? "";
}

export async function submitAttendanceAction(
  eventId: string,
  photoUrl: string
): Promise<ActionResult<{ attendanceId: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  if (!photoUrl?.trim()) {
    return { success: false, error: "Photo proof is required." };
  }

  const supabase = await createClient();
  const { data: attendanceId, error } = await supabase.rpc("submit_event_attendance", {
    p_event_id: eventId,
    p_photo_url: photoUrl.trim(),
  });

  if (error) {
    const msg = error.message.includes("already submitted")
      ? "You already submitted attendance for this event."
      : error.message;
    return { success: false, error: msg };
  }

  revalidatePath(`/events/${eventId}`);
  return {
    success: true,
    data: { attendanceId: attendanceId as string },
  };
}

export async function reviewAttendanceAction(
  attendanceId: string,
  approve: boolean
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("event_attendance")
    .select("group_id, event_id, user_id")
    .eq("id", attendanceId)
    .single();

  if (!row || !(await isGroupAdmin(userId, row.group_id))) {
    return { success: false, error: "Not authorized to review attendance." };
  }

  const { error } = await supabase.rpc("review_event_attendance", {
    p_attendance_id: attendanceId,
    p_approve: approve,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/events/${row.event_id}`);
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");

  return { success: true, data: undefined };
}
