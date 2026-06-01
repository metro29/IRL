import Link from "next/link";
import { Settings, Shield, UsersRound } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUserProfile } from "@/lib/db/profiles";
import { getCurrentUserGroup } from "@/lib/db/groups";
import { safePageLoad } from "@/lib/server/safe-page";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/db/profiles";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const result = await safePageLoad(async () => {
    const [profile, group] = await Promise.all([
      getCurrentUserProfile(),
      getCurrentUserGroup(),
    ]);
    return { profile, group };
  });

  if (result.error) {
    return (
      <PageShell
        title="Settings"
        description="Manage your account and preferences."
        status="error"
        errorMessage={result.error}
      />
    );
  }

  const profile = result.data?.profile;
  const group = result.data?.group;

  if (!profile) {
    return (
      <PageShell
        title="Settings"
        description="Manage your account and preferences."
        status="empty"
        emptyTitle="Profile not found"
        emptyDescription="Try signing out and back in."
      />
    );
  }

  return (
    <PageShell
      title="Settings"
      description="Manage your account and preferences."
      status="ready"
    >
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>Your public IRL profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Username</span>
            <span className="font-medium">@{profile.username}</span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Display name</span>
            <span className="font-medium">{profile.display_name}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Level</span>
            <span className="font-medium">{profile.level}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-xl opacity-90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-4 w-4" />
            Password
          </CardTitle>
          <CardDescription>Change password will be available in a later update.</CardDescription>
        </CardHeader>
      </Card>
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-4 w-4 text-primary" />
            Admin access
          </CardTitle>
          <CardDescription>Two different concepts in IRL</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium">Group admin (in use today)</p>
            <p className="mt-1 text-muted-foreground">
              If you created a group or were promoted, you can schedule events and approve
              attendance on the Events pages. Open your group from Groups.
            </p>
            {group ? (
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href={`/groups/${group.id}`}>
                  <UsersRound className="mr-2 h-4 w-4" />
                  Your group ({group.my_role})
                </Link>
              </Button>
            ) : (
              <p className="mt-2 text-muted-foreground">
                You are not in a group yet — create or join one on{" "}
                <Link href="/groups" className="font-medium text-primary underline-offset-4 hover:underline">
                  Groups
                </Link>
                .
              </p>
            )}
          </div>
          <div className="border-t pt-4">
            <p className="font-medium">Platform admin</p>
            <p className="mt-1 text-muted-foreground">
              A separate global panel at{" "}
              <Link href="/admin" className="font-mono text-xs text-primary underline-offset-4 hover:underline">
                /admin
              </Link>{" "}
              is reserved for future site-wide tools. It is not in the nav and is not enabled yet.
            </p>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
