"use client";

import { cn } from "@/lib/utils";

export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-1 px-2 py-1", className)}
      aria-label="Sending"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-fx-typing-dot rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </div>
  );
}
