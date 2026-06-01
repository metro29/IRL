import { Badge } from "@/components/ui/badge";
import type { EventStatus } from "@/types/domain";
import { cn } from "@/lib/utils";

const labels: Record<EventStatus, string> = {
  scheduled: "Scheduled",
  active: "Live",
  ended: "Ended",
};

const variants: Record<EventStatus, "secondary" | "default" | "outline"> = {
  scheduled: "secondary",
  active: "default",
  ended: "outline",
};

export function EventStatusBadge({
  status,
  className,
  pulse,
}: {
  status: EventStatus;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <Badge
      variant={variants[status]}
      className={cn(
        status === "active" && pulse && "animate-pulse",
        className
      )}
    >
      {status === "active" ? "● " : ""}
      {labels[status]}
    </Badge>
  );
}
