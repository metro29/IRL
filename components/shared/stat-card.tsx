import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: "default" | "primary" | "warm";
  className?: string;
}

const accentIcon = {
  default: "bg-muted text-foreground",
  primary: "bg-primary/15 text-primary",
  warm: "bg-amber-500/15 text-amber-700",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "default",
  className,
}: StatCardProps) {
  return (
    <div className={cn("irl-stat-card", className)}>
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-3xl font-bold tabular-nums tracking-tight md:text-4xl">
            {value}
          </p>
          {hint ? (
            <p className="text-sm text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            accentIcon[accent]
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}
