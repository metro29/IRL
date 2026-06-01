"use client";

import { useState, useTransition } from "react";
import { Copy, Check, LogOut, MessageSquare, UsersRound } from "lucide-react";
import { GroupChatPanel } from "@/components/features/chat/group-chat-panel";
import { PageShell } from "@/components/shared/page-shell";
import { UserCard } from "@/components/shared/user-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { leaveGroupAction } from "@/lib/actions/groups";
import { feedback } from "@/lib/feedback/feedback";
import { useRouter } from "next/navigation";
import { useSocialHydration } from "@/hooks/use-social-hydration";
import type {
  GroupMemberWithProfile,
  GroupMessageWithAuthor,
  GroupWithMeta,
} from "@/types/domain";
import { MAX_GROUP_SIZE } from "@/lib/constants/groups";
import { cn } from "@/lib/utils";

type GroupTab = "members" | "chat";

interface GroupDetailClientProps {
  group: GroupWithMeta;
  members: GroupMemberWithProfile[];
  currentUserId: string;
  initialMessages: GroupMessageWithAuthor[];
}

function roleBadgeVariant(
  role: GroupMemberWithProfile["display_role"]
): "owner" | "admin" | "member" {
  return role;
}

export function GroupDetailClient({
  group,
  members,
  currentUserId,
  initialMessages,
}: GroupDetailClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<GroupTab>("members");
  const [copied, setCopied] = useState(false);
  const [leaving, startLeave] = useTransition();

  useSocialHydration({
    currentGroup: group,
    groupId: group.id,
    groupMembers: members,
  });

  const copyCode = async () => {
    await navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    feedback.info("Copied!", "Invite code copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    const isOwner = group.owner_id === currentUserId;
    const msg = isOwner
      ? "Leaving as owner will delete this group for everyone. Continue?"
      : "Leave this group?";
    if (!confirm(msg)) return;

    startLeave(async () => {
      const result = await leaveGroupAction(group.id);
      if (!result.success) {
        feedback.error("Could not leave", result.error);
        return;
      }
      feedback.success(
        isOwner ? "Group deleted" : "Left group",
        isOwner ? "Your group has been removed." : "You can join another group anytime."
      );
      router.push("/groups");
      router.refresh();
    });
  };

  return (
    <div className={cn("space-y-8 animate-fade-in")}>
      <PageShell
        title={group.name}
        description={group.description ?? "No description yet."}
        status="ready"
      >
        <Card className="rounded-xl border-primary/20 bg-gradient-to-br from-accent/80 to-background">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <UsersRound className="h-5 w-5 text-primary" />
                  {group.member_count} / {MAX_GROUP_SIZE} members
                </CardTitle>
                <CardDescription className="mt-1">
                  Your role:{" "}
                  <Badge variant={roleBadgeVariant(group.my_role)} className="ml-1">
                    {group.my_role}
                  </Badge>
                </CardDescription>
              </div>
              <Button variant="destructive" size="sm" onClick={handleLeave} disabled={leaving}>
                <LogOut className="mr-2 h-4 w-4" />
                {leaving ? "Leaving…" : group.owner_id === currentUserId ? "Delete Group" : "Leave Group"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border bg-background px-4 py-2 font-mono text-lg font-bold tracking-widest">
              {group.invite_code}
            </div>
            <Button variant="outline" size="sm" onClick={() => void copyCode()} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy code"}
            </Button>
          </CardContent>
        </Card>
      </PageShell>

      <div className="flex gap-2 border-b pb-2">
        <Button
          size="sm"
          variant={tab === "members" ? "default" : "outline"}
          onClick={() => setTab("members")}
          className="gap-2 rounded-xl"
        >
          <UsersRound className="h-4 w-4" />
          Members
        </Button>
        <Button
          size="sm"
          variant={tab === "chat" ? "default" : "outline"}
          onClick={() => setTab("chat")}
          className="gap-2 rounded-xl"
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </Button>
      </div>

      {tab === "members" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Members</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {members.map((member) => (
              <UserCard
                key={member.id}
                user={member.profile}
                badge={
                  <Badge variant={roleBadgeVariant(member.display_role)}>
                    {member.display_role}
                  </Badge>
                }
                subtitle={member.user_id === currentUserId ? "You" : undefined}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Group chat</h2>
          <GroupChatPanel
            groupId={group.id}
            currentUserId={currentUserId}
            initialMessages={initialMessages}
          />
        </section>
      )}
    </div>
  );
}
