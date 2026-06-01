"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavIcon } from "@/components/layout/nav-icons";
import { cn } from "@/lib/utils";

export interface MobileNavItem {
  href: string;
  label: string;
  icon: string;
}

interface MobileBottomNavProps {
  items: MobileNavItem[];
}

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around gap-1">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = getNavIcon(item.icon);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[11px] transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground active:bg-accent/50"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                  active && "bg-primary/15"
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
