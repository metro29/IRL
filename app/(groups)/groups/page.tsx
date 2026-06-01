import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/db/profiles";
import { getCurrentUserGroup } from "@/lib/db/groups";
import { GroupsHubClient } from "@/components/features/groups/groups-hub-client";
import { PageShell } from "@/components/shared/page-shell";
import { safePageLoad } from "@/lib/server/safe-page";

export default async function GroupsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const result = await safePageLoad(() => getCurrentUserGroup());

  if (result.error || !result.data) {
    return (
      <PageShell
        title="Groups"
        description="Team up with friends."
        status="error"
        errorMessage={result.error ?? "Failed to load groups."}
      />
    );
  }

  return <GroupsHubClient currentGroup={result.data} />;
}
