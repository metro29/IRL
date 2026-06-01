"use client";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const variantStyles: Record<string, string> = {
  default: "border-border bg-card text-card-foreground",
  destructive: "border-destructive/50 bg-destructive text-destructive-foreground",
  success: "border-primary/25 bg-accent text-accent-foreground",
  info: "border-primary/30 bg-accent text-accent-foreground",
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 md:bottom-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={cn(
            "pointer-events-auto animate-fx-toast-in rounded-xl border px-4 py-3 shadow-lg will-change-transform",
            variantStyles[t.variant ?? "default"]
          )}
          onClick={() => dismiss(t.id)}
        >
          {t.title ? <p className="text-sm font-semibold">{t.title}</p> : null}
          {t.description ? (
            <p className="mt-0.5 text-sm opacity-90">{t.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
