import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { UI_EMPTY_PAD } from "@/lib/constants/ui";

interface EmptyPanelProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyPanel({
  title,
  description,
  icon,
  action,
  className,
}: EmptyPanelProps) {
  return (
    <div className={cn("irl-empty", className)}>
      <div className={UI_EMPTY_PAD}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          {icon ?? <Inbox className="h-7 w-7" />}
        </div>
        <div className="space-y-2">
          <p className="font-display text-lg font-semibold">{title}</p>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </div>
  );
}
