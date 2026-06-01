"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GroupMessageWithAuthor, ProfilePublic } from "@/types/domain";

const PROFILE_SELECT =
  "id, username, display_name, avatar_url, level, points, xp";

function mapProfileRow(p: Record<string, unknown>): ProfilePublic {
  return {
    id: p.id as string,
    username: p.username as string,
    display_name: p.display_name as string,
    avatar_url: (p.avatar_url as string | null) ?? null,
    level: p.level as number,
    points: p.points as number,
    xp: p.xp as number,
  };
}

function rowFromPayload(
  newRow: Record<string, unknown>,
  author: ProfilePublic
): GroupMessageWithAuthor {
  return {
    id: newRow.id as string,
    group_id: newRow.group_id as string,
    user_id: newRow.user_id as string,
    message: newRow.message as string,
    message_type: newRow.message_type as "text" | "image",
    created_at: newRow.created_at as string,
    author,
  };
}

export function useGroupChat(
  groupId: string,
  initialMessages: GroupMessageWithAuthor[]
) {
  const [messages, setMessages] = useState(initialMessages);
  const hydratedGroupRef = useRef<string | null>(null);
  const messagesRef = useRef(messages);
  const authorCacheRef = useRef(new Map<string, ProfilePublic>());

  messagesRef.current = messages;
  for (const m of messages) {
    authorCacheRef.current.set(m.user_id, m.author);
  }

  useEffect(() => {
    if (hydratedGroupRef.current !== groupId) {
      hydratedGroupRef.current = groupId;
      authorCacheRef.current.clear();
      for (const m of initialMessages) {
        authorCacheRef.current.set(m.user_id, m.author);
      }
      setMessages(initialMessages);
    }
  }, [groupId, initialMessages]);

  const appendMessage = useCallback((msg: GroupMessageWithAuthor) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      authorCacheRef.current.set(msg.user_id, msg.author);
      return [...prev, msg];
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const resolveAuthor = async (userId: string): Promise<ProfilePublic> => {
      const cached = authorCacheRef.current.get(userId);
      if (cached) return cached;

      const { data } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("id", userId)
        .single();

      if (data) {
        const profile = mapProfileRow(data as Record<string, unknown>);
        authorCacheRef.current.set(userId, profile);
        return profile;
      }

      return {
        id: userId,
        username: "unknown",
        display_name: "Unknown",
        avatar_url: null,
        level: 1,
        points: 0,
        xp: 0,
      };
    };

    const channel = supabase
      .channel(`group-chat:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;
          const id = newRow.id as string;
          if (messagesRef.current.some((m) => m.id === id)) return;

          void resolveAuthor(newRow.user_id as string).then((author) => {
            appendMessage(rowFromPayload(newRow, author));
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [groupId, appendMessage]);

  return { messages, appendMessage };
}
