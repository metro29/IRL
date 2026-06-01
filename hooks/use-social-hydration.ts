"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/use-app-store";
import type {
  FriendRequestWithProfiles,
  FriendWithProfile,
  GroupMemberWithProfile,
  GroupWithMeta,
} from "@/types/domain";

interface SocialHydrationPayload {
  friends?: FriendWithProfile[];
  incomingRequests?: FriendRequestWithProfiles[];
  outgoingRequests?: FriendRequestWithProfiles[];
  currentGroup?: GroupWithMeta | null;
  groupMembers?: GroupMemberWithProfile[];
  groupId?: string;
}

export function useSocialHydration(payload: SocialHydrationPayload) {
  const setFriends = useAppStore((s) => s.setFriends);
  const setFriendRequests = useAppStore((s) => s.setFriendRequests);
  const setCurrentGroup = useAppStore((s) => s.setCurrentGroup);
  const setGroupMembers = useAppStore((s) => s.setGroupMembers);

  useEffect(() => {
    if (payload.friends) setFriends(payload.friends);
    if (payload.incomingRequests && payload.outgoingRequests) {
      setFriendRequests(payload.incomingRequests, payload.outgoingRequests);
    }
    if (payload.currentGroup !== undefined) {
      setCurrentGroup(payload.currentGroup);
    }
    if (payload.groupId && payload.groupMembers) {
      setGroupMembers(payload.groupId, payload.groupMembers);
    }
  }, [
    payload.friends,
    payload.incomingRequests,
    payload.outgoingRequests,
    payload.currentGroup,
    payload.groupMembers,
    payload.groupId,
    setFriends,
    setFriendRequests,
    setCurrentGroup,
    setGroupMembers,
  ]);
}
