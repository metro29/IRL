"use client";

import { useState, useTransition } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { SectionHeading } from "@/components/shared/section-heading";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { UserCard } from "@/components/shared/user-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FriendActionButtons } from "@/components/features/friends/friend-action-buttons";
import { searchUsersAction } from "@/lib/actions/friends";
import { useSocialHydration } from "@/hooks/use-social-hydration";
import { feedback } from "@/lib/feedback/feedback";
import type {
  FriendRequestWithProfiles,
  FriendWithProfile,
  SearchUserResult,
} from "@/types/domain";
import {
  acceptFriendRequestAction,
  rejectFriendRequestAction,
} from "@/lib/actions/friends";
import { useRouter } from "next/navigation";
import { UI_PAGE_SECTION, UI_SECTION, UI_GRID } from "@/lib/constants/ui";

interface FriendsPageClientProps {
  friends: FriendWithProfile[];
  incomingRequests: FriendRequestWithProfiles[];
  outgoingRequests: FriendRequestWithProfiles[];
}

export function FriendsPageClient({
  friends,
  incomingRequests,
  outgoingRequests,
}: FriendsPageClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [requestPending, startRequest] = useTransition();

  useSocialHydration({
    friends,
    incomingRequests,
    outgoingRequests,
  });

  const handleSearch = () => {
    startSearch(async () => {
      setSearchError(null);
      const result = await searchUsersAction(query);
      if (!result.success) {
        setSearchResults([]);
        setSearchError(result.error);
        feedback.error("Search failed", result.error);
        return;
      }
      setSearchResults(result.data);
    });
  };

  const handleIncoming = (
    requestId: string,
    action: "accept" | "reject"
  ) => {
    startRequest(async () => {
      const result =
        action === "accept"
          ? await acceptFriendRequestAction(requestId)
          : await rejectFriendRequestAction(requestId);
      if (!result.success) {
        feedback.error("Failed", result.error);
        return;
      }
      if (action === "accept") {
        feedback.success("Friend added!", "You can now invite them to your group.");
      } else {
        feedback.info("Request declined");
      }
      router.refresh();
    });
  };

  const hasRequests =
    incomingRequests.length > 0 || outgoingRequests.length > 0;

  return (
    <div className={UI_PAGE_SECTION}>
      <PageShell
        title="Friends"
        description="Search by username, send requests, and build your crew."
        status="ready"
      >
        <section className={UI_SECTION}>
          <SectionHeading icon={<Search className="h-5 w-5" />}>
            Find people
          </SectionHeading>
          <div className="flex gap-2">
            <Input
              placeholder="Search username…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching || query.length < 2}>
              {searching ? "Searching…" : "Search"}
            </Button>
          </div>
          {searchResults.length > 0 ? (
            <div className={UI_GRID}>
              {searchResults.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  actions={
                    <FriendActionButtons
                      targetUserId={user.id}
                      relationship={user.relationship}
                      requestId={user.request_id}
                      onSuccess={() => handleSearch()}
                    />
                  }
                />
              ))}
            </div>
          ) : searchError ? (
            <p className="text-sm text-destructive">{searchError}</p>
          ) : query.length >= 2 && !searching ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : null}
        </section>
      </PageShell>

      {hasRequests ? (
        <section className={UI_SECTION}>
          <SectionHeading icon={<UserPlus className="h-5 w-5" />}>
            Requests
          </SectionHeading>
          {incomingRequests.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Incoming</p>
              <div className={UI_GRID}>
                {incomingRequests.map((req) => (
                  <UserCard
                    key={req.id}
                    user={req.sender}
                    subtitle="wants to be friends"
                    actions={
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={requestPending}
                          onClick={() => handleIncoming(req.id, "accept")}
                        >
                          {requestPending ? "…" : "Accept"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={requestPending}
                          onClick={() => handleIncoming(req.id, "reject")}
                        >
                          Reject
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
          {outgoingRequests.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Outgoing</p>
              <div className={UI_GRID}>
                {outgoingRequests.map((req) => (
                  <UserCard
                    key={req.id}
                    user={req.receiver}
                    subtitle="pending"
                    actions={
                      <FriendActionButtons
                        targetUserId={req.receiver.id}
                        relationship="pending_sent"
                        requestId={req.id}
                        onSuccess={() => router.refresh()}
                      />
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className={UI_SECTION}>
        <SectionHeading icon={<Users className="h-5 w-5" />}>
          Your friends ({friends.length})
        </SectionHeading>
        {friends.length === 0 ? (
          <EmptyPanel
            title="No friends yet"
            description="Search by username above to send your first friend request."
            icon={<Users className="h-6 w-6 text-primary" />}
          />
        ) : (
          <div className={UI_GRID}>
            {friends.map(({ friend }) => (
              <UserCard key={friend.id} user={friend} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
