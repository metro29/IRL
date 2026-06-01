import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { UI_SECTION_TITLE } from "@/lib/constants/ui";

interface SectionHeadingProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function SectionHeading({ children, icon, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <h2 className={UI_SECTION_TITLE}>
        {icon ? <span className="irl-section-label-icon">{icon}</span> : null}
        {children}
      </h2>
    </div>
  );
}
