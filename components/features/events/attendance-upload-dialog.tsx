"use client";

import { useRef, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { submitAttendanceAction } from "@/lib/actions/game";
import { uploadProofPhoto } from "@/lib/storage/upload-proof";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { AttendanceStatus } from "@/types/domain";

interface AttendanceUploadDialogProps {
  eventId: string;
  userId: string;
  existingStatus?: AttendanceStatus | null;
}

export function AttendanceUploadDialog({
  eventId,
  userId,
  existingStatus,
}: AttendanceUploadDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (existingStatus) {
    return (
      <Button variant="outline" disabled>
        Attendance: {existingStatus}
      </Button>
    );
  }

  const handleFile = (file: File) => {
    startTransition(async () => {
      try {
        const url = await uploadProofPhoto(file, "attendance", userId);
        const result = await submitAttendanceAction(eventId, url);
        if (!result.success) {
          toast({
            title: "Upload failed",
            description: result.error,
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Attendance submitted",
          description: "Waiting for admin approval (+25 XP when approved).",
        });
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast({
          title: "Upload failed",
          description: e instanceof Error ? e.message : "Could not upload photo.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Camera className="h-4 w-4" />
          Submit Attendance
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Event attendance proof</DialogTitle>
          <DialogDescription>
            Upload a photo showing you at the event. An admin must approve before you earn XP.
          </DialogDescription>
        </DialogHeader>
        <input
          ref={inputRef}
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
          onClick={() => inputRef.current?.click()}
        >
          {pending ? "Uploading…" : "Choose photo"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
