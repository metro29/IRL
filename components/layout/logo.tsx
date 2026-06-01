import Link from "next/link";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  /** Dark auth panels use light wordmark */
  variant?: "default" | "light";
}

export function AppLogo({ className, variant = "default" }: AppLogoProps) {
  const isLight = variant === "light";

  return (
    <Link
      href="/dashboard"
      className={cn(
        "group inline-flex items-center gap-2.5 transition-opacity hover:opacity-90",
        className
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border font-display text-sm font-extrabold tracking-tighter transition-transform group-hover:scale-[1.02]",
          isLight
            ? "border-[#f5f2eb]/20 bg-[#f5f2eb]/5 text-[#f5f2eb]"
            : "border-foreground/10 bg-foreground text-background"
        )}
        aria-hidden
      >
        IRL
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-lg font-extrabold tracking-[-0.06em]",
            isLight ? "text-[#f5f2eb]" : "text-foreground"
          )}
        >
          IRL
        </span>
        <span
          className={cn(
            "mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em]",
            isLight ? "text-[#f5f2eb]/40" : "text-muted-foreground"
          )}
        >
          with your crew
        </span>
      </span>
    </Link>
  );
}
