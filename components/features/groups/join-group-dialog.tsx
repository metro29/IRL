"use client";

import { useState, useTransition } from "react";
import { LogIn } from "lucide-react";
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
import { joinGroupByInviteCodeAction } from "@/lib/actions/groups";
import { feedback } from "@/lib/feedback/feedback";
import { useRouter } from "next/navigation";
import { MAX_GROUP_SIZE } from "@/lib/constants/groups";

export function JoinGroupDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const code = String(form.get("inviteCode") ?? "");

    startTransition(async () => {
      const result = await joinGroupByInviteCodeAction(code);
      if (!result.success) {
        feedback.error("Could not join", result.error);
        return;
      }
      feedback.success("Welcome to the group!", "You're in — say hi in chat.");
      setOpen(false);
      router.push(`/groups/${result.data.groupId}`);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <LogIn className="h-4 w-4" />
          Join with Code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a group</DialogTitle>
          <DialogDescription>
            Enter the 8-character invite code from a friend. One group per user, max{" "}
            {MAX_GROUP_SIZE} members.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Invite code</Label>
            <Input
              id="inviteCode"
              name="inviteCode"
              required
              minLength={8}
              maxLength={8}
              placeholder="AB12CD34"
              className="uppercase tracking-widest"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
              }}
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Joining…" : "Join Group"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
