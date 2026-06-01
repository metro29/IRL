"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ProfilePublic } from "@/types/domain";
import { cn } from "@/lib/utils";
import { UI_CARD } from "@/lib/constants/ui";

interface UserCardProps {
  user: ProfilePublic;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function UserCard({ user, subtitle, badge, actions, className }: UserCardProps) {
  const initials = user.display_name.slice(0, 2).toUpperCase();

  return (
    <Card className={cn(UI_CARD, className)}>
      <CardContent className="flex items-center gap-4 p-5">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.avatar_url ?? undefined} alt="" />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{user.display_name}</p>
            {badge}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            @{user.username}
            {subtitle ? ` · ${subtitle}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Lvl {user.level} · {user.points} pts
          </p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}

export function LevelBadge({ level }: { level: number }) {
  return <Badge variant="secondary">Lvl {level}</Badge>;
}
