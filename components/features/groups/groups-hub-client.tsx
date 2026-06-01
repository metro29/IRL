"use client";

import Link from "next/link";
import { UsersRound } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { CreateGroupDialog } from "@/components/features/groups/create-group-dialog";
import { JoinGroupDialog } from "@/components/features/groups/join-group-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSocialHydration } from "@/hooks/use-social-hydration";
import type { GroupWithMeta } from "@/types/domain";
import { UI_CARD, UI_PAGE_SECTION } from "@/lib/constants/ui";

interface GroupsHubClientProps {
  currentGroup: GroupWithMeta | null;
}

export function GroupsHubClient({ currentGroup }: GroupsHubClientProps) {
  useSocialHydration({ currentGroup });

  if (currentGroup) {
    return (
      <PageShell
        title="Your Group"
        description="You're already in a group — head to the group page to see members and your invite code."
        status="ready"
      >
        <Card className={UI_CARD}>
          <CardHeader>
            <CardTitle>{currentGroup.name}</CardTitle>
            <CardDescription>
              {currentGroup.member_count} member
              {currentGroup.member_count === 1 ? "" : "s"} · Code{" "}
              <span className="font-mono font-semibold text-foreground">
                {currentGroup.invite_code}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/groups/${currentGroup.id}`}>Open Group</Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <div className={UI_PAGE_SECTION}>
      <PageShell
        title="Groups"
        description="Team up with friends — one group per person, up to 20 members."
        status="ready"
      />
      <EmptyPanel
        title="Create or join a group"
        description="Start a new group or enter an invite code from a friend to begin playing together."
        icon={<UsersRound className="h-6 w-6 text-primary" />}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <CreateGroupDialog />
            <JoinGroupDialog />
          </div>
        }
      />
    </div>
  );
}
