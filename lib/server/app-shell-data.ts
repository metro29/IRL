import { getSupabaseEnv } from "@/lib/supabase/config";
import { getCurrentUserProfile, getCurrentUserId } from "@/lib/db/profiles";
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
} from "@/lib/db/notifications";
import type { NotificationRow } from "@/types/domain";
import type { Profile } from "@/types/database";

export type AppShellDataResult =
  | {
      ok: true;
      profile: Profile | null;
      userId: string | null;
      initialNotifications: NotificationRow[];
      initialUnreadCount: number;
    }
  | {
      ok: false;
      reason: "config" | "error";
      message: string;
    };

export async function loadAppShellData(): Promise<AppShellDataResult> {
  if (!getSupabaseEnv()) {
    return {
      ok: false,
      reason: "config",
      message:
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY on Vercel. Add them under Settings → Environment Variables, then redeploy.",
    };
  }

  try {
    const [profile, userId] = await Promise.all([
      getCurrentUserProfile(),
      getCurrentUserId(),
    ]);

    let initialNotifications: NotificationRow[] = [];
    let initialUnreadCount = 0;

    if (userId) {
      try {
        [initialNotifications, initialUnreadCount] = await Promise.all([
          getNotificationsForUser(userId),
          getUnreadNotificationCount(userId),
        ]);
      } catch {
        initialNotifications = [];
        initialUnreadCount = 0;
      }
    }

    return {
      ok: true,
      profile,
      userId,
      initialNotifications,
      initialUnreadCount,
    };
  } catch (e) {
    return {
      ok: false,
      reason: "error",
      message:
        e instanceof Error
          ? e.message
          : "Could not load app data. Check Supabase migrations and API keys.",
    };
  }
}
