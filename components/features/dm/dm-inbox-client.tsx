"use client";

import Link from "next/link";
import { MessageCircle, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SectionHeading } from "@/components/shared/section-heading";
import { UI_PAGE_SECTION, UI_SECTION } from "@/lib/constants/ui";
import type { DmConversationPreview, FriendWithProfile } from "@/types/domain";
import { cn } from "@/lib/utils";

interface DmInboxClientProps {
  conversations: DmConversationPreview[];
  friends: FriendWithProfile[];
  currentUserId: string;
}

export function DmInboxClient({
  conversations,
  friends,
  currentUserId,
}: DmInboxClientProps) {
  const friendsWithoutThread = friends.filter(
    (f) => !conversations.some((c) => c.friend.id === f.friend.id)
  );

  return (
    <div className={UI_PAGE_SECTION}>
      <PageShell
        title="Messages"
        description="Private chats with friends only — not open to everyone."
        status="ready"
      />

      <section className={UI_SECTION}>
        <SectionHeading icon={<MessageCircle className="h-4 w-4" />}>
          Conversations
        </SectionHeading>
        {conversations.length === 0 ? (
          <EmptyPanel
            title="No messages yet"
            description="Start a private chat with a friend below."
            icon={<MessageCircle className="h-7 w-7" />}
          />
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const initials = conv.friend.display_name.slice(0, 2).toUpperCase();
              const isOwnLast = conv.last_sender_id === currentUserId;
              return (
                <Link
                  key={conv.conversation_id}
                  href={`/messages/${conv.friend.id}`}
                  className="irl-card-interactive flex items-center gap-3 rounded-xl p-4"
                >
                  <Avatar className="h-11 w-11 ring-2 ring-primary/10">
                    <AvatarImage src={conv.friend.avatar_url ?? undefined} alt="" />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{conv.friend.display_name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {conv.last_message
                        ? `${isOwnLast ? "You: " : ""}${conv.last_message}`
                        : "No messages yet"}
                    </p>
                  </div>
                  {conv.last_message_at ? (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {new Date(conv.last_message_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className={UI_SECTION}>
        <SectionHeading icon={<Users className="h-4 w-4" />}>
          Message a friend
        </SectionHeading>
        {friends.length === 0 ? (
          <EmptyPanel
            title="Add friends first"
            description="You can only DM people you're friends with. Send requests on the Friends page."
            icon={<Users className="h-7 w-7" />}
            action={
              <Link
                href="/friends"
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
                )}
              >
                Go to Friends
              </Link>
            }
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {(friendsWithoutThread.length > 0 ? friendsWithoutThread : friends).map(
              ({ friend }) => {
                const initials = friend.display_name.slice(0, 2).toUpperCase();
                return (
                  <Link
                    key={friend.id}
                    href={`/messages/${friend.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border/80 bg-card p-3 transition-colors hover:bg-accent/40"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={friend.avatar_url ?? undefined} alt="" />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{friend.display_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{friend.username}
                      </p>
                    </div>
                    <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}
