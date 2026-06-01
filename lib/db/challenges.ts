import { createClient } from "@/lib/supabase/server";
import type { Challenge, ChallengeWithCompletion } from "@/types/domain";

export async function getChallengesForEvent(
  eventId: string,
  userId: string
): Promise<ChallengeWithCompletion[]> {
  const supabase = await createClient();

  const { data: challenges, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  if (!challenges?.length) return [];

  const { data: submissions, error: subError } = await supabase
    .from("submissions")
    .select("id, challenge_id")
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (subError) throw subError;

  const completedMap = new Map(
    (submissions ?? []).map((s) => [s.challenge_id, s.id])
  );

  return (challenges as Challenge[]).map((c) => ({
    ...c,
    tier: c.tier as ChallengeWithCompletion["tier"],
    completed: completedMap.has(c.id),
    submission_id: completedMap.get(c.id),
  }));
}

export async function getActiveChallengesForGroup(
  groupId: string,
  userId: string
): Promise<ChallengeWithCompletion[]> {
  const supabase = await createClient();
  const { data: activeEvents, error: evError } = await supabase
    .from("events")
    .select("id")
    .eq("group_id", groupId)
    .eq("status", "active");

  if (evError) throw evError;
  if (!activeEvents?.length) return [];

  const all: ChallengeWithCompletion[] = [];
  for (const ev of activeEvents) {
    const list = await getChallengesForEvent(ev.id, userId);
    all.push(...list.filter((c) => !c.completed));
  }
  return all;
}
