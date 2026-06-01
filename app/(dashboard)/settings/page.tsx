import { Settings } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserProfile } from "@/lib/db/profiles";
import { safePageLoad } from "@/lib/server/safe-page";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/db/profiles";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const result = await safePageLoad(() => getCurrentUserProfile());

  if (result.error || !result.data) {
    return (
      <PageShell
        title="Settings"
        description="Manage your account and preferences."
        status="error"
        errorMessage={result.error ?? "Failed to load settings."}
      />
    );
  }

  const profile = result.data;

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
    </PageShell>
  );
}
