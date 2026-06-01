"use client";

import { useRef, useState, useTransition } from "react";
import { Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { awardChallengeCompletionAction } from "@/lib/actions/game";
import { uploadProofPhoto } from "@/lib/storage/upload-proof";
import { feedback } from "@/lib/feedback/feedback";
import { useRouter } from "next/navigation";
import type { ChallengeWithCompletion } from "@/types/domain";

interface ChallengeSubmitDialogProps {
  challenge: ChallengeWithCompletion;
  userId: string;
  currentLevel?: number;
  compact?: boolean;
}

export function ChallengeSubmitDialog({
  challenge,
  userId,
  currentLevel = 1,
  compact,
}: ChallengeSubmitDialogProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [pending, startTransition] = useTransition();

  if (challenge.completed) {
    return <Badge variant="secondary">Completed</Badge>;
  }

  const handleFile = (file: File) => {
    startTransition(async () => {
      try {
        const url = await uploadProofPhoto(file, "challenges", userId);
        const result = await awardChallengeCompletionAction(
          challenge.id,
          url,
          caption
        );
        if (!result.success) {
          feedback.error("Submission failed", result.error);
          return;
        }

        feedback.xpGain({
          xp: result.data.xpAwarded,
          points: result.data.pointsAwarded,
          origin: triggerRef.current,
          cardId: challenge.id,
          message: "Challenge complete!",
        });

        if (result.data.newLevel > currentLevel) {
          feedback.levelUp(result.data.newLevel, result.data.newXp);
        }

        setOpen(false);
        router.refresh();
      } catch (e) {
        feedback.error(
          "Upload failed",
          e instanceof Error ? e.message : "Could not upload photo."
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button ref={triggerRef} size={compact ? "sm" : "default"} className="gap-1">
          <Zap className="h-4 w-4" />
          Complete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{challenge.title}</DialogTitle>
          <DialogDescription>
            {challenge.description} — instant +{challenge.xp_value} XP, +
            {challenge.points_value} pts
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Input
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What happened?"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button
            className="w-full"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            {pending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Submitting…
              </span>
            ) : (
              "Upload proof & complete"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
