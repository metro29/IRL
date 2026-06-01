import { getCurrentUserId } from "@/lib/db/profiles";
import { getFriendsWithProfiles } from "@/lib/db/friends";
import {
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
} from "@/lib/db/friend-requests";
import { FriendsPageClient } from "@/components/features/friends/friends-page-client";
import { PageShell } from "@/components/shared/page-shell";
import { safePageLoad } from "@/lib/server/safe-page";
import { redirect } from "next/navigation";

export default async function FriendsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const result = await safePageLoad(async () => {
    const [friends, incomingRequests, outgoingRequests] = await Promise.all([
      getFriendsWithProfiles(userId),
      getIncomingFriendRequests(userId),
      getOutgoingFriendRequests(userId),
    ]);
    return { friends, incomingRequests, outgoingRequests };
  });

  if (result.error || !result.data) {
    return (
      <PageShell
        title="Friends"
        description="Search, requests, and your crew."
        status="error"
        errorMessage={result.error ?? "Failed to load friends."}
      />
    );
  }

  return (
    <FriendsPageClient
      friends={result.data.friends}
      incomingRequests={result.data.incomingRequests}
      outgoingRequests={result.data.outgoingRequests}
    />
  );
}
