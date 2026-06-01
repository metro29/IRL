"use client";

import { memo, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TypingIndicator } from "@/components/feedback/typing-indicator";
import { sendGroupMessageAction } from "@/lib/actions/messages";
import { uploadChatImage } from "@/lib/storage/upload-chat-image";
import { useGroupChat } from "@/hooks/use-group-chat";
import { feedback } from "@/lib/feedback/feedback";
import { cn } from "@/lib/utils";
import type { GroupMessageWithAuthor } from "@/types/domain";

interface GroupChatPanelProps {
  groupId: string;
  currentUserId: string;
  initialMessages: GroupMessageWithAuthor[];
}

export function GroupChatPanel({
  groupId,
  currentUserId,
  initialMessages,
}: GroupChatPanelProps) {
  const { messages } = useGroupChat(groupId, initialMessages);
  const [text, setText] = useState("");
  const [inputFade, setInputFade] = useState(false);
  const [sending, startSend] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendText = () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setInputFade(true);
    startSend(async () => {
      const result = await sendGroupMessageAction(groupId, trimmed, "text");
      setInputFade(false);
      if (!result.success) {
        feedback.error("Could not send", result.error);
        return;
      }
      setText("");
    });
  };

  const handleImagePick = (file: File | undefined) => {
    if (!file || sending) return;

    startSend(async () => {
      try {
        const url = await uploadChatImage(file, groupId, currentUserId);
        const result = await sendGroupMessageAction(groupId, url, "image");
        if (!result.success) {
          feedback.error("Could not send image", result.error);
          return;
        }
      } catch (e) {
        feedback.error(
          "Upload failed",
          e instanceof Error ? e.message : "Try again."
        );
      }
    });
  };

  return (
    <div className="flex h-[min(520px,65vh)] flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Say hi to your group — messages appear instantly for everyone.
          </p>
        ) : (
          messages.map((msg) => (
            <MemoChatBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.user_id === currentUserId}
            />
          ))
        )}
        {sending ? <TypingIndicator /> : null}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t bg-muted/30 p-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            handleImagePick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-xl"
          aria-label="Upload image"
          disabled={sending}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="h-5 w-5" />
        </Button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message your group…"
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

const MemoChatBubble = memo(function ChatBubble({
  msg,
  isOwn,
}: {
  msg: GroupMessageWithAuthor;
  isOwn: boolean;
}) {
  const initials = msg.author.display_name.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "animate-fx-chat-message flex gap-2 will-change-transform",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="h-8 w-8 shrink-0 animate-fx-avatar-pop">
        <AvatarImage src={msg.author.avatar_url ?? undefined} alt="" />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "max-w-[75%] space-y-0.5",
          isOwn ? "items-end text-right" : "items-start"
        )}
      >
        <p className="text-xs font-medium text-muted-foreground">
          {isOwn ? "You" : msg.author.display_name}
        </p>
        <div
          className={cn(
            "inline-block rounded-2xl px-3 py-2 text-sm",
            isOwn
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-muted"
          )}
        >
          {msg.message_type === "image" ? (
            <a href={msg.message} target="_blank" rel="noopener noreferrer">
              <Image
                src={msg.message}
                alt="Shared image"
                width={240}
                height={180}
                className="max-h-48 rounded-lg object-cover"
                unoptimized
              />
            </a>
          ) : (
            <span className="whitespace-pre-wrap break-words">{msg.message}</span>
          )}
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
