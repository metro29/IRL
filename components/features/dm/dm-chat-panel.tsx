"use client";

import { memo, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TypingIndicator } from "@/components/feedback/typing-indicator";
import { sendDmMessageAction } from "@/lib/actions/dm";
import { useDmChat } from "@/hooks/use-dm-chat";
import { feedback } from "@/lib/feedback/feedback";
import { cn } from "@/lib/utils";
import type { DmMessageWithAuthor, ProfilePublic } from "@/types/domain";

interface DmChatPanelProps {
  conversationId: string;
  friend: ProfilePublic;
  currentUserId: string;
  initialMessages: DmMessageWithAuthor[];
}

export function DmChatPanel({
  conversationId,
  friend,
  currentUserId,
  initialMessages,
}: DmChatPanelProps) {
  const { messages } = useDmChat(conversationId, initialMessages);
  const [text, setText] = useState("");
  const [inputFade, setInputFade] = useState(false);
  const [sending, startSend] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const initials = friend.display_name.slice(0, 2).toUpperCase();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendText = () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setInputFade(true);
    startSend(async () => {
      const result = await sendDmMessageAction(
        conversationId,
        friend.id,
        trimmed
      );
      setInputFade(false);
      if (!result.success) {
        feedback.error("Could not send", result.error);
        return;
      }
      setText("");
    });
  };

  return (
    <div className="flex h-[min(560px,70vh)] flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
        <Button variant="ghost" size="icon" className="shrink-0 rounded-xl md:hidden" asChild>
          <Link href="/messages" aria-label="Back to messages">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Avatar className="h-9 w-9 ring-2 ring-primary/15">
          <AvatarImage src={friend.avatar_url ?? undefined} alt="" />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">{friend.display_name}</p>
          <p className="truncate text-xs text-muted-foreground">@{friend.username}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Say hi to {friend.display_name} — only friends can see this chat.
          </p>
        ) : (
          messages.map((msg) => (
            <MemoDmBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.sender_id === currentUserId}
            />
          ))
        )}
        {sending ? <TypingIndicator /> : null}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t bg-muted/30 p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${friend.display_name}…`}
          className={cn("rounded-xl fx-input-fade", inputFade && "fx-clearing")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendText();
            }
          }}
          disabled={sending}
        />
        <Button
          type="button"
          size="icon"
          className="shrink-0 rounded-xl"
          disabled={sending || !text.trim()}
          onClick={sendText}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const MemoDmBubble = memo(function DmBubble({
  msg,
  isOwn,
}: {
  msg: DmMessageWithAuthor;
  isOwn: boolean;
}) {
  return (
    <div
      className={cn(
        "animate-fx-chat-message flex gap-2 will-change-transform",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] space-y-0.5",
          isOwn ? "items-end text-right" : "items-start"
        )}
      >
        <div
          className={cn(
            "inline-block rounded-2xl px-3 py-2 text-sm",
            isOwn
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-muted"
          )}
        >
          <span className="whitespace-pre-wrap break-words">{msg.message}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
});
