import { loadAppShellData } from "@/lib/server/app-shell-data";
import { MOBILE_NAV_ITEMS, NAV_ITEMS } from "@/lib/constants/routes";
import { TopNav } from "@/components/layout/top-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SessionProvider } from "@/components/layout/session-provider";
import { PageTransition } from "@/components/layout/page-transition";
import { ConfigErrorPanel } from "@/components/layout/config-error-panel";

interface AppShellProps {
  children: React.ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  const shell = await loadAppShellData();

  if (!shell.ok) {
    return (
      <ConfigErrorPanel
        title={shell.reason === "config" ? "Supabase not configured" : "Something went wrong"}
        message={shell.message}
      />
    );
  }

  const { profile, userId, initialNotifications, initialUnreadCount } = shell;

  const sidebarItems = NAV_ITEMS.map((item) => ({
    href: item.href,
    label: item.label,
    icon: item.icon,
  }));

  const mobileItems = MOBILE_NAV_ITEMS.map((item) => ({
    href: item.href,
    label: item.label,
    icon: item.icon,
  }));

  return (
    <SessionProvider profile={profile}>
      <div className="min-h-screen bg-background bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--accent)/0.5),transparent_50%)]">
        <TopNav
          profile={profile}
          userId={userId}
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
        />
        <div className="mx-auto flex w-full max-w-7xl">
          <SidebarNav items={sidebarItems} />
          <main className="min-h-[calc(100vh-4rem)] flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-8">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <MobileBottomNav items={mobileItems} />
      </div>
    </SessionProvider>
  );
}
