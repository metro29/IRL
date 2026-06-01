"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { getNavIcon } from "@/components/layout/nav-icons";
import { cn } from "@/lib/utils";

export interface MobileNavItem {
  href: string;
  label: string;
  icon: string;
}

interface MobileBottomNavProps {
  items: MobileNavItem[];
  allItems: MobileNavItem[];
}

export function MobileBottomNav({ items, allItems }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryHrefs = useMemo(() => new Set(items.map((item) => item.href)), [items]);

  const moreItems = useMemo(
    () => allItems.filter((item) => !primaryHrefs.has(item.href)),
    [allItems, primaryHrefs]
  );

  const moreActive = moreItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  return (
    <>
      {moreOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          "fixed inset-x-0 z-50 rounded-t-2xl border border-border/80 bg-card shadow-2xl transition-transform duration-300 ease-out md:hidden",
          "pb-[calc(4.5rem+env(safe-area-inset-bottom))]",
          moreOpen ? "bottom-0 translate-y-0" : "bottom-0 translate-y-full pointer-events-none"
        )}
        aria-hidden={!moreOpen}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <p className="font-display text-sm font-semibold">All pages</p>
          <button
            type="button"
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent/60"
            onClick={() => setMoreOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="grid grid-cols-2 gap-2 p-3">
          {allItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = getNavIcon(item.icon);
            const isPrimary = primaryHrefs.has(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent/60",
                  isPrimary && "ring-1 ring-border/60"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/90 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around gap-0.5">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = getNavIcon(item.icon);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] transition-colors sm:text-[11px]",
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
                <span className="max-w-full truncate font-semibold">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            aria-label="Open all pages"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] transition-colors sm:text-[11px]",
              moreOpen || moreActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground active:bg-accent/50"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                (moreOpen || moreActive) && "bg-primary/15"
              )}
            >
              <Menu className="h-5 w-5" />
            </span>
            <span className="font-semibold">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
