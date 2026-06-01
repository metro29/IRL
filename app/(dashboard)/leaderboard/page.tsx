import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/db/profiles";
import { getCurrentUserGroup } from "@/lib/db/groups";
import { getGroupLeaderboard, getGlobalLeaderboard } from "@/lib/db/leaderboard";
import { LeaderboardClient } from "@/components/features/leaderboard/leaderboard-client";
import { PageShell } from "@/components/shared/page-shell";
import { safePageLoad } from "@/lib/server/safe-page";

export default async function LeaderboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const result = await safePageLoad(async () => {
    const group = await getCurrentUserGroup();
    const [groupEntries, globalEntries] = await Promise.all([
      group ? getGroupLeaderboard(group.id) : Promise.resolve([]),
      getGlobalLeaderboard(25),
    ]);
    return { groupEntries, globalEntries, groupId: group?.id ?? null };
  });

  if (result.error || !result.data) {
    return (
      <PageShell
        title="Leaderboard"
        description="Live rankings for your group and globally."
        status="error"
        errorMessage={result.error ?? "Failed to load leaderboard."}
      />
    );
  }

  return (
    <LeaderboardClient
      groupEntries={result.data.groupEntries}
      globalEntries={result.data.globalEntries}
      groupId={result.data.groupId}
      currentUserId={userId}
    />
  );
}
