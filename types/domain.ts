import type { Profile } from "@/types/database";

export type FriendRequestStatus = "pending" | "accepted" | "rejected";
export type GroupMemberRole = "member" | "admin";
export type EventStatus = "scheduled" | "active" | "ended";
export type AttendanceStatus = "pending" | "approved" | "rejected";
export type RsvpStatus = "going" | "maybe" | "not_going";
export type ChallengeTier = 1 | 3 | 5 | 10;

export type ProfilePublic = Pick<
  Profile,
  "id" | "username" | "display_name" | "avatar_url" | "level" | "points" | "xp"
>;

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface FriendRequestWithProfiles extends FriendRequest {
  sender: ProfilePublic;
  receiver: ProfilePublic;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
}

export interface FriendWithProfile {
  friendship_id: string;
  friend: ProfilePublic;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  owner_id: string;
  created_at: string;
}

export type GroupMemberDisplayRole = "owner" | "admin" | "member";

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
  joined_at: string;
}

export interface GroupMemberWithProfile extends GroupMember {
  profile: ProfilePublic;
  display_role: GroupMemberDisplayRole;
}

export interface GroupWithMeta extends Group {
  member_count: number;
  my_role: GroupMemberDisplayRole;
}

export type FriendRelationshipStatus =
  | "self"
  | "friends"
  | "pending_sent"
  | "pending_received"
  | "none";

export interface SearchUserResult extends ProfilePublic {
  relationship: FriendRelationshipStatus;
  request_id?: string;
}

export interface Event {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  status: EventStatus;
  created_by: string;
  challenges_generated: boolean;
  created_at: string;
}

export interface EventRsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  created_at: string;
}

export interface EventAttendance {
  id: string;
  event_id: string;
  group_id: string;
  user_id: string;
  photo_url: string;
  status: AttendanceStatus;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface EventWithMeta extends Event {
  rsvp_count: number;
  my_rsvp: EventRsvp | null;
  my_attendance: EventAttendance | null;
  is_admin: boolean;
}

export interface Challenge {
  id: string;
  event_id: string;
  group_id: string;
  title: string;
  description: string;
  tier: ChallengeTier;
  xp_value: number;
  points_value: number;
  sort_order: number;
  created_at: string;
}

export interface ChallengeWithCompletion extends Challenge {
  completed: boolean;
  submission_id?: string;
}

export interface Submission {
  id: string;
  challenge_id: string;
  event_id: string;
  group_id: string;
  user_id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  profile: ProfilePublic;
  points: number;
  xp: number;
  level: number;
}

export type MessageType = "text" | "image";

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  message: string;
  message_type: MessageType;
  created_at: string;
}

export interface GroupMessageWithAuthor extends GroupMessage {
  author: ProfilePublic;
}

export interface DmConversation {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
}

export interface DmMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  message_type: MessageType;
  created_at: string;
}

export interface DmMessageWithAuthor extends DmMessage {
  author: ProfilePublic;
}

export interface DmConversationPreview {
  conversation_id: string;
  friend: ProfilePublic;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
}

export type NotificationType =
  | "friend_request"
  | "friend_accept"
  | "event_created"
  | "event_live"
  | "challenge_completed"
  | "xp_awarded"
  | "attendance_approved";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type ActivityFeedKind =
  | "challenge_completed"
  | "attendance_approved"
  | "xp_gained"
  | "event_created";

export type ActivityFeedSourceType =
  | "xp_log"
  | "submission"
  | "event_attendance"
  | "event";

export interface ActivityFeedItem {
  id: string;
  kind: ActivityFeedKind;
  source_type: ActivityFeedSourceType;
  source_id: string;
  created_at: string;
  user: ProfilePublic;
  title: string;
  description: string;
  href?: string;
}
