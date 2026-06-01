import { create } from "zustand";
import type { Profile } from "@/types/database";
import type {
  FriendRequestWithProfiles,
  FriendWithProfile,
  GroupMemberWithProfile,
  GroupWithMeta,
  LeaderboardEntry,
} from "@/types/domain";
import type { User } from "@supabase/supabase-js";

interface AppState {
  user: User | null;
  profile: Profile | null;
  currentGroupId: string | null;
  notificationCount: number;
  friends: FriendWithProfile[];
  incomingFriendRequests: FriendRequestWithProfiles[];
  outgoingFriendRequests: FriendRequestWithProfiles[];
  currentGroup: GroupWithMeta | null;
  groupMembersCache: Record<string, GroupMemberWithProfile[]>;
  groupLeaderboard: LeaderboardEntry[];
  setGroupLeaderboard: (entries: LeaderboardEntry[]) => void;
  setSession: (user: User | null, profile: Profile | null) => void;
  setCurrentGroupId: (groupId: string | null) => void;
  setNotificationCount: (count: number) => void;
  setFriends: (friends: FriendWithProfile[]) => void;
  setFriendRequests: (
    incoming: FriendRequestWithProfiles[],
    outgoing: FriendRequestWithProfiles[]
  ) => void;
  setCurrentGroup: (group: GroupWithMeta | null) => void;
  setGroupMembers: (groupId: string, members: GroupMemberWithProfile[]) => void;
  clearSession: () => void;
}

const initialSocial = {
  friends: [] as FriendWithProfile[],
  incomingFriendRequests: [] as FriendRequestWithProfiles[],
  outgoingFriendRequests: [] as FriendRequestWithProfiles[],
  currentGroup: null as GroupWithMeta | null,
  groupMembersCache: {} as Record<string, GroupMemberWithProfile[]>,
  groupLeaderboard: [] as LeaderboardEntry[],
};

export const useAppStore = create<AppState>((set) => ({
  user: null,
  profile: null,
  currentGroupId: null,
  notificationCount: 0,
  ...initialSocial,
  setSession: (user, profile) => set({ user, profile }),
  setCurrentGroupId: (groupId) => set({ currentGroupId: groupId }),
  setNotificationCount: (count) => set({ notificationCount: count }),
  setFriends: (friends) => set({ friends }),
  setFriendRequests: (incoming, outgoing) =>
    set({
      incomingFriendRequests: incoming,
      outgoingFriendRequests: outgoing,
    }),
  setCurrentGroup: (group) =>
    set({
      currentGroup: group,
      currentGroupId: group?.id ?? null,
    }),
  setGroupMembers: (groupId, members) =>
    set((state) => ({
      groupMembersCache: { ...state.groupMembersCache, [groupId]: members },
    })),
  setGroupLeaderboard: (entries) => set({ groupLeaderboard: entries }),
  clearSession: () =>
    set({
      user: null,
      profile: null,
      currentGroupId: null,
      notificationCount: 0,
      ...initialSocial,
      groupMembersCache: {},
      groupLeaderboard: [],
    }),
}));
