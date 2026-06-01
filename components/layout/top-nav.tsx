"use client";

import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/layout/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase/auth";
import { useAppStore } from "@/store/use-app-store";
import type { Profile } from "@/types/database";
import type { NotificationRow } from "@/types/domain";

interface TopNavProps {
  profile: Profile | null;
  userId: string | null;
  initialNotifications: NotificationRow[];
  initialUnreadCount: number;
}

export function TopNav({
  profile,
  userId,
  initialNotifications,
  initialUnreadCount,
}: TopNavProps) {
  const router = useRouter();

  const initials =
    profile?.display_name?.slice(0, 2).toUpperCase() ??
    profile?.username?.slice(0, 2).toUpperCase() ??
    "?";

  const handleSignOut = async () => {
    await signOut();
    useAppStore.getState().clearSession();
    router.push("/login");
    router.refresh();
  };

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;

  return (
    <header className="irl-glass sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        <AppLogo />
        {profile ? (
          <div className="hidden items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3 py-1.5 text-xs font-medium shadow-sm sm:flex">
            <span className="text-muted-foreground">Lvl</span>
            <span className="font-display font-bold text-primary">{level}</span>
            <span className="h-3 w-px bg-border" aria-hidden />
            <span className="tabular-nums text-muted-foreground">{xp} XP</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <NotificationsBell
            userId={userId}
            initialNotifications={initialNotifications}
            initialUnreadCount={initialUnreadCount}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                <Avatar className="h-9 w-9 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.display_name ?? "Guest"}</p>
                <p className="text-xs text-muted-foreground">
                  @{profile?.username ?? "—"}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => void handleSignOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
