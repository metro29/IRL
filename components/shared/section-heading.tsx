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
    <h2 className={cn(UI_SECTION_TITLE, className)}>
      {icon ? <span className="text-primary">{icon}</span> : null}
      {children}
    </h2>
  );
}
