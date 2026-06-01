import { redirect } from "next/navigation";
import { getCurrentUserProfile, getCurrentUserId } from "@/lib/db/profiles";
import { getCurrentUserGroup, getGroupMembersWithProfiles } from "@/lib/db/groups";
import { getTodaysEventForGroup } from "@/lib/db/events";
import { getActiveChallengesForGroup } from "@/lib/db/challenges";
import { getGroupActivityFeed } from "@/lib/db/activity-feed";
import { DashboardClient } from "@/components/features/dashboard/dashboard-client";
import { PageShell } from "@/components/shared/page-shell";
import { safePageLoad } from "@/lib/server/safe-page";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const result = await safePageLoad(async () => {
    const profile = await getCurrentUserProfile();
    const group = await getCurrentUserGroup();

    const [todaysEvent, activeChallenges, activityFeed, members] = group
      ? await Promise.all([
          getTodaysEventForGroup(group.id),
          getActiveChallengesForGroup(group.id, userId),
          getGroupActivityFeed(group.id),
          getGroupMembersWithProfiles(group.id, group.owner_id),
        ])
      : [null, [], [], []];

    const memberUserIds = members.map((m) => m.user_id);

    return {
      profile,
      todaysEvent,
      activeChallenges,
      activityFeed,
      groupId: group?.id ?? null,
      memberUserIds,
    };
  });

  if (result.error || !result.data) {
    return (
      <PageShell
        title="Dashboard"
        description="Your IRL home base."
        status="error"
        errorMessage={result.error ?? "Failed to load dashboard."}
      />
    );
  }

  const {
    profile,
    todaysEvent,
    activeChallenges,
    activityFeed,
    groupId,
    memberUserIds,
  } = result.data;

  return (
    <DashboardClient
      profile={profile}
      todaysEvent={todaysEvent}
      activeChallenges={activeChallenges}
      currentUserId={userId}
      groupId={groupId}
      activityFeed={activityFeed}
      memberUserIds={memberUserIds}
    />
  );
}
