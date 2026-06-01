export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  xp: number;
  level: number;
  streak: number;
  created_at: string;
  updated_at: string;
}

export type EventStatus = "scheduled" | "active" | "ended";
export type AttendanceStatus = "pending" | "approved" | "rejected";
export type RsvpStatus = "going" | "maybe" | "not_going";

export interface ProfileInsert {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  points?: number;
  xp?: number;
  level?: number;
  streak?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  id?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
  points?: number;
  xp?: number;
  level?: number;
  streak?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
