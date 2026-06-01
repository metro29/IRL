"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trophy, Users } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { SectionHeading } from "@/components/shared/section-heading";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { UserCard } from "@/components/shared/user-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRealtimeLeaderboard } from "@/hooks/use-realtime-leaderboard";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/use-app-store";
import { feedback } from "@/lib/feedback/feedback";
import { useFeedbackStore } from "@/store/use-feedback-store";
import type { LeaderboardEntry } from "@/types/domain";
import { UI_PAGE_SECTION, UI_SECTION } from "@/lib/constants/ui";
import { cn } from "@/lib/utils";

interface LeaderboardClientProps {
  groupEntries: LeaderboardEntry[];
  globalEntries: LeaderboardEntry[];
  groupId: string | null;
  currentUserId: string;
}

export function LeaderboardClient({
  groupEntries: initialGroup,
  globalEntries: initialGlobal,
  groupId,
  currentUserId,
}: LeaderboardClientProps) {
  const router = useRouter();
  const [groupEntries, setGroupEntries] = useState(initialGroup);
  const [globalEntries, setGlobalEntries] = useState(initialGlobal);
  const setGroupLeaderboard = useAppStore((s) => s.setGroupLeaderboard);
  const prevRankRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const prev = prevRankRef.current;
    const myPrev = prev.get(currentUserId);
    const myNew = initialGroup.find((e) => e.profile.id === currentUserId)?.rank;
    if (myPrev !== undefined && myNew !== undefined && myPrev !== myNew) {
      feedback.highlightLeaderboardUser(currentUserId);
    }
    const next = new Map<string, number>();
    initialGroup.forEach((e) => next.set(e.profile.id, e.rank));
    prevRankRef.current = next;

    setGroupEntries(initialGroup);
    setGlobalEntries(initialGlobal);
    setGroupLeaderboard(initialGroup);
  }, [initialGroup, initialGlobal, currentUserId, setGroupLeaderboard]);

  const memberUserIds = groupEntries.map((e) => e.profile.id);
  const refresh = useCallback(() => router.refresh(), [router]);
  useRealtimeLeaderboard(groupId, memberUserIds, refresh);

  const renderList = (
    entries: LeaderboardEntry[],
    empty: { title: string; description: string; action?: React.ReactNode },
    highlightUserId?: string | null
  ) => {
    if (entries.length === 0) {
      return (
        <EmptyPanel
          title={empty.title}
          description={empty.description}
          icon={<Trophy className="h-6 w-6 text-primary" />}
          action={empty.action}
        />
      );
    }
    return (
      <div className="grid gap-3">
        {entries.map((entry) => (
          <div
            key={entry.profile.id}
            className={cn(
              "relative transition-transform duration-300 ease-out will-change-transform",
              "animate-leaderboard-reorder",
              entry.profile.id === highlightUserId && "fx-row-highlight",
              entry.rank <= 3 && "rounded-xl"
            )}
            style={{ animationDelay: `${Math.min(entry.rank, 8) * 30}ms` }}
          >
            <Badge
              className={cn(
                "absolute -left-1 -top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full p-0",
                entry.rank <= 3 ? "fx-top-rank" : ""
              )}
              variant={entry.rank <= 3 ? "default" : "secondary"}
            >
              {entry.rank}
            </Badge>
            <UserCard
              user={entry.profile}
              subtitle={`${entry.points} pts · ${entry.xp} XP`}
              className={cn(
                entry.profile.id === currentUserId && "ring-2 ring-primary/30",
                entry.rank <= 3 && "fx-top-rank"
              )}
            />
          </div>
        ))}
      </div>
    );
  };

  const highlightUserId = useFeedbackStore((s) => s.leaderboardHighlightUserId);

  return (
    <div className={UI_PAGE_SECTION}>
      <PageShell
        title="Leaderboard"
        description="Rankings update live when XP changes."
        status="ready"
      />

      <section className={UI_SECTION}>
        <SectionHeading icon={<Users className="h-5 w-5" />}>Your group</SectionHeading>
        {renderList(
          groupEntries,
          {
            title: groupId ? "No rankings yet" : "Join a group",
            description: groupId
              ? "Complete challenges to climb the board."
              : "Join a group to compete with your crew.",
            action: !groupId ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/groups">Find a group</Link>
              </Button>
            ) : undefined,
          },
          highlightUserId
        )}
      </section>

      <section className={UI_SECTION}>
        <SectionHeading icon={<Trophy className="h-5 w-5" />}>
          Global top players
        </SectionHeading>
        {renderList(globalEntries, {
          title: "No players yet",
          description: "Be the first to earn XP and claim the top spot.",
        })}
      </section>
    </div>
  );
}
