import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UI_CARD, UI_EMPTY_PAD } from "@/lib/constants/ui";

export function LoadingState() {
  return (
    <Card className={UI_CARD}>
      <CardContent className={UI_EMPTY_PAD}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </CardContent>
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className={`${UI_CARD} border-destructive/30`}>
      <CardContent className={`${UI_EMPTY_PAD} text-center`}>
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-medium">Could not load this page</p>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <Card className={UI_CARD}>
      <CardContent className={`${UI_EMPTY_PAD} text-center`}>
        {icon ?? <Inbox className="h-10 w-10 text-muted-foreground/60" />}
        <p className="font-medium">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
