"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { updateAvatarAction } from "@/lib/actions/profile";
import { uploadAvatar } from "@/lib/storage/upload-avatar";
import { feedback } from "@/lib/feedback/feedback";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/use-app-store";
import type { Profile } from "@/types/database";

interface ProfilePhotoEditorProps {
  profile: Profile;
}

export function ProfilePhotoEditor({ profile }: ProfilePhotoEditorProps) {
  const router = useRouter();
  const setSession = useAppStore((s) => s.setSession);
  const user = useAppStore((s) => s.user);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile.avatar_url);
  const [pending, startTransition] = useTransition();

  const initials = profile.display_name.slice(0, 2).toUpperCase();

  const saveAvatar = (file: File) => {
    startTransition(async () => {
      try {
        const url = await uploadAvatar(file, profile.id);
        const result = await updateAvatarAction(url);
        if (!result.success) {
          feedback.error("Could not save photo", result.error);
          return;
        }
        setPreviewUrl(url);
        if (user) {
          setSession(user, { ...profile, avatar_url: url });
        }
        feedback.success("Profile photo updated");
        router.refresh();
      } catch (e) {
        feedback.error(
          "Upload failed",
          e instanceof Error ? e.message : "Could not upload photo."
        );
      }
    });
  };

  const removeAvatar = () => {
    if (!previewUrl) return;
    if (!confirm("Remove your profile photo?")) return;

    startTransition(async () => {
      const result = await updateAvatarAction(null);
      if (!result.success) {
        feedback.error("Could not remove photo", result.error);
        return;
      }
      setPreviewUrl(null);
      if (user) {
        setSession(user, { ...profile, avatar_url: null });
      }
      feedback.info("Profile photo removed");
      router.refresh();
    });
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) saveAvatar(file);
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative">
        <Avatar className="h-24 w-24 ring-2 ring-primary/20 ring-offset-2 ring-offset-card">
          <AvatarImage src={previewUrl ?? undefined} alt="" />
          <AvatarFallback className="font-display text-xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {pending ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 text-center sm:text-left">
        <div>
          <p className="font-display font-semibold">{profile.display_name}</p>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={onFileChange}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            className="hidden"
            onChange={onFileChange}
          />
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={pending}
            className="gap-2"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            Take photo
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            className="gap-2"
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImageIcon className="h-4 w-4" />
            Choose image
          </Button>
          {previewUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={removeAvatar}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          JPG, PNG, or WebP · max 5 MB. Shown on your profile, friends list, chat, and
          leaderboard.
        </p>
      </div>
    </div>
  );
}
