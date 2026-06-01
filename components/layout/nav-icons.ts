import {
  Calendar,
  LayoutDashboard,
  MessageCircle,
  Settings,
  Target,
  Trophy,
  User,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export const NAV_ICONS = {
  LayoutDashboard,
  Users,
  MessageCircle,
  UsersRound,
  Calendar,
  Target,
  Trophy,
  Settings,
  User,
} as const;

export type NavIconName = keyof typeof NAV_ICONS;

export function getNavIcon(name: string): LucideIcon {
  return NAV_ICONS[name as NavIconName] ?? LayoutDashboard;
}
