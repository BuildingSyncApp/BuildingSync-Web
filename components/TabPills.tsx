"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Bordered uppercase pill tabs in the R&D aesthetic. Used for in-page
// sub-navigation: e.g. work-orders filter (All / Open / In progress /
// Closed) or residents (Residents / Tenants / Vacant).
//
// Two ways to drive these: pass `value`+`onChange` for client-side state,
// or pass `hrefKey` and rely on usePathname() for route-driven tabs.

export type TabItem = {
  key: string;
  label: string;
  href?: string; // when set, tab is a link
  count?: number; // optional badge on right
};

export function TabPills({
  items,
  value,
  onChange,
  className = "",
  size = "md",
}: {
  items: TabItem[];
  value?: string;
  onChange?: (key: string) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const pathname = usePathname();
  const padX = size === "sm" ? "px-3" : "px-4";
  const padY = size === "sm" ? "py-1.5" : "py-2";

  return (
    <div className={`flex items-center gap-2 overflow-x-auto scrollbar-hide ${className}`} role="tablist">
      {items.map((item) => {
        const active = item.href
          ? pathname === item.href || pathname.startsWith(item.href + "/")
          : value === item.key;

        const cls = `${padX} ${padY} rounded-md border text-[11px] font-mono uppercase tracking-widest transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 ${
          active
            ? "border-accent text-accent bg-accent/5"
            : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
        }`;

        const inner = (
          <>
            <span>{item.label}</span>
            {typeof item.count === "number" && (
              <span className={`px-1.5 py-0.5 rounded-sm text-[10px] ${active ? "bg-accent/15" : "bg-muted/40"}`}>
                {item.count}
              </span>
            )}
          </>
        );

        if (item.href) {
          return (
            <Link key={item.key} href={item.href} className={cls} role="tab" aria-selected={active}>
              {inner}
            </Link>
          );
        }

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange?.(item.key)}
            className={cls}
            role="tab"
            aria-selected={active}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
