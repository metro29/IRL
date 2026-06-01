import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { UI_PAGE } from "@/lib/constants/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/shared/state-blocks";

export type PageStatus = "ready" | "loading" | "error" | "empty";

interface PageShellProps {
  title: string;
  description?: string;
  status?: PageStatus;
  errorMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Optional hero slot above main content (dashboard welcome, etc.) */
  hero?: ReactNode;
}

export function PageShell({
  title,
  description,
  status = "empty",
  errorMessage,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  children,
  className,
  hero,
}: PageShellProps) {
  return (
    <div className={cn(UI_PAGE, className)}>
      {hero}
      <header className="space-y-2 border-b border-border/50 pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>

      {status === "loading" ? <LoadingState /> : null}
      {status === "error" ? (
        <ErrorState message={errorMessage ?? "Something went wrong."} />
      ) : null}
      {status === "empty" ? (
        <EmptyState
          title={emptyTitle ?? "Nothing here yet"}
          description={
            emptyDescription ??
            "Content will appear here once you start using IRL."
          }
          icon={emptyIcon}
        />
      ) : null}
      {status === "ready" ? children : null}
    </div>
  );
}
