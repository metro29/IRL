import { notFound, redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/db/profiles";
import {
  getGroupById,
  getGroupMembersWithProfiles,
  getGroupWithMetaForUser,
  isGroupMember,
} from "@/lib/db/groups";
import { getGroupMessages } from "@/lib/db/messages";
import { GroupDetailClient } from "@/components/features/groups/group-detail-client";
import { PageShell } from "@/components/shared/page-shell";
import { safePageLoad } from "@/lib/server/safe-page";

interface GroupDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const isMember = await isGroupMember(id, userId);
  if (!isMember) notFound();

  const result = await safePageLoad(async () => {
    const [group, groupMeta] = await Promise.all([
      getGroupById(id),
      getGroupWithMetaForUser(id, userId),
    ]);

    if (!group || !groupMeta) {
      throw new Error("Group not found.");
    }

    const [members, initialMessages] = await Promise.all([
      getGroupMembersWithProfiles(id, group.owner_id),
      getGroupMessages(id),
    ]);

    return { group: groupMeta, members, initialMessages };
  });

  if (result.error || !result.data) {
    return (
      <PageShell
        title="Group"
        description="Your crew hub."
        status="error"
        errorMessage={result.error ?? "Failed to load group."}
      />
    );
  }

  return (
    <GroupDetailClient
      group={result.data.group}
      members={result.data.members}
      currentUserId={userId}
      initialMessages={result.data.initialMessages}
    />
  );
}
