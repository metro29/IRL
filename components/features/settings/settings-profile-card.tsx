"use client";

import { ProfilePhotoEditor } from "@/components/features/settings/profile-photo-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types/database";

interface SettingsProfileCardProps {
  profile: Profile;
}

export function SettingsProfileCard({ profile }: SettingsProfileCardProps) {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg">Profile</CardTitle>
        <CardDescription>Your photo and public IRL identity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ProfilePhotoEditor profile={profile} />
        <div className="space-y-3 border-t pt-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Username</span>
            <span className="font-medium">@{profile.username}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Display name</span>
            <span className="font-medium">{profile.display_name}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Level</span>
            <span className="font-medium">{profile.level}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
