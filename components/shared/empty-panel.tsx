import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { UI_CARD, UI_EMPTY_PAD } from "@/lib/constants/ui";

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
    <Card className={cn(UI_CARD, className)}>
      <CardContent className={UI_EMPTY_PAD}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          {icon ?? <Inbox className="h-6 w-6 text-muted-foreground" />}
        </div>
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="pt-2">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
