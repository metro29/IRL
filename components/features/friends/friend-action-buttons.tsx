"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  acceptFriendRequestAction,
  cancelFriendRequestAction,
  rejectFriendRequestAction,
  sendFriendRequestAction,
} from "@/lib/actions/friends";
import { feedback } from "@/lib/feedback/feedback";
import { useRouter } from "next/navigation";
import type { FriendRelationshipStatus } from "@/types/domain";

interface FriendActionButtonsProps {
  targetUserId: string;
  relationship: FriendRelationshipStatus;
  requestId?: string;
  onSuccess?: () => void;
}

export function FriendActionButtons({
  targetUserId,
  relationship,
  requestId,
  onSuccess,
}: FriendActionButtonsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    router.refresh();
    onSuccess?.();
  };

  const run = (action: () => Promise<{ success: boolean; error?: string }>) => {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        feedback.error("Action failed", result.error);
        return;
      }
      feedback.success(
        "Done",
        relationship === "pending_received"
          ? "You are now friends!"
          : relationship === "pending_sent"
            ? "Request updated."
            : "Friend request sent."
      );
      refresh();
    });
  };

  if (relationship === "self") return null;

  if (relationship === "friends") {
    return <Badge variant="secondary">Friends</Badge>;
  }

  if (relationship === "pending_sent") {
    return (
      <div className="flex gap-2">
        <Badge variant="pending">Pending</Badge>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !requestId}
          onClick={() =>
            requestId &&
            run(async () => {
              const r = await cancelFriendRequestAction(requestId);
              return { success: r.success, error: r.success ? undefined : r.error };
            })
          }
        >
          Cancel
        </Button>
      </div>
    );
  }

  if (relationship === "pending_received") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending || !requestId}
          onClick={() =>
            requestId &&
            run(async () => {
              const r = await acceptFriendRequestAction(requestId);
              return { success: r.success, error: r.success ? undefined : r.error };
            })
          }
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !requestId}
          onClick={() =>
            requestId &&
            run(async () => {
              const r = await rejectFriendRequestAction(requestId);
              return { success: r.success, error: r.success ? undefined : r.error };
            })
          }
        >
          Reject
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        run(async () => {
          const r = await sendFriendRequestAction(targetUserId);
          return { success: r.success, error: r.success ? undefined : r.error };
        })
      }
    >
      Add Friend
    </Button>
  );
}
