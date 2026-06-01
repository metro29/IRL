"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteEventAction } from "@/lib/actions/events";
import { feedback } from "@/lib/feedback/feedback";
import { cn } from "@/lib/utils";

interface DeleteEventButtonProps {
  eventId: string;
  eventTitle: string;
  /** After delete on the detail page, navigate away */
  redirectTo?: string;
  size?: "sm" | "default";
  className?: string;
}

export function DeleteEventButton({
  eventId,
  eventTitle,
  redirectTo,
  size = "sm",
  className,
}: DeleteEventButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    const ok = confirm(
      `Delete "${eventTitle}" for everyone in your group?\n\nRSVPs, challenges, and attendance for this event will be removed. This cannot be undone.`
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteEventAction(eventId);
      if (!result.success) {
        feedback.error("Could not delete event", result.error);
        return;
      }
      feedback.success("Event deleted", "Removed for your whole group.");
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      disabled={pending}
      onClick={handleDelete}
      className={cn(
        "gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive",
        className
      )}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
