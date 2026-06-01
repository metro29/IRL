import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/db/profiles";
import { getFriendsWithProfiles } from "@/lib/db/friends";
import { getDmInbox } from "@/lib/db/dm";
import { DmInboxClient } from "@/components/features/dm/dm-inbox-client";
import { PageShell } from "@/components/shared/page-shell";
import { safePageLoad } from "@/lib/server/safe-page";

export default async function MessagesPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const result = await safePageLoad(async () => {
    const [conversations, friends] = await Promise.all([
      getDmInbox(userId),
      getFriendsWithProfiles(userId),
    ]);
    return { conversations, friends };
  });

  if (result.error || !result.data) {
    return (
      <PageShell
        title="Messages"
        description="Private chats with friends."
        status="error"
        errorMessage={result.error ?? "Failed to load messages."}
      />
    );
  }

  return (
    <DmInboxClient
      conversations={result.data.conversations}
      friends={result.data.friends}
      currentUserId={userId}
    />
  );
}
