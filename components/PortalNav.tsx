"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavSection } from "@/components/MobileMenu";

// Two-level portal nav matching the R&D BuildingSync header pattern:
// L1 is a row of pill tabs (section labels — Operations, People,
// Property, Compliance), L2 is a contextual row of pill tabs below
// it showing the active section's children, plus a breadcrumb
// position indicator ("OPERATIONS · 2 / 3"). Both rows always
// visible — no dropdowns — so users see the full structure at a
// glance.

function isActiveHref(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function activeIndex(pathname: string, sections: NavSection[]) {
  // Pick the section with the longest-matching item href so nested
  // routes resolve to the most specific section.
  let bestIdx = -1;
  let bestLen = -1;
  sections.forEach((section, idx) => {
    section.items.forEach((item) => {
      if (isActiveHref(pathname, item.href) && item.href.length > bestLen) {
        bestIdx = idx;
        bestLen = item.href.length;
      }
    });
  });
  return bestIdx;
}

function activeItemIndex(pathname: string, section: NavSection): number {
  let bestIdx = -1;
  let bestLen = -1;
  section.items.forEach((item, idx) => {
    if (isActiveHref(pathname, item.href) && item.href.length > bestLen) {
      bestIdx = idx;
      bestLen = item.href.length;
    }
  });
  return bestIdx;
}

// Pill-tab class. Shared between L1 and L2 so the visual language is
// consistent; L2 uses a slightly smaller variant. Mobile gets taller
// padding so pills hit the ≥40px touch-target sweet spot; desktop
// stays tight.
function pillClass({
  active,
  size = "md",
}: {
  active: boolean;
  size?: "sm" | "md";
}) {
  const padX = size === "sm" ? "px-3" : "px-3.5 md:px-4";
  const padY = size === "sm" ? "py-2 md:py-1.5" : "py-2.5 md:py-2";
  return `${padX} ${padY} rounded-md border text-[11px] font-mono uppercase tracking-widest transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 ${
    active
      ? "border-accent text-accent bg-accent/5"
      : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
  }`;
}

export function PortalNavL1({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const active = activeIndex(pathname, sections);

  return (
    <nav
      className="flex items-center gap-2 min-w-0 overflow-x-auto scrollbar-hide -mx-1 px-1"
      role="tablist"
      aria-label="Section"
    >
      {sections.map((section, idx) => {
        const isActive = idx === active;
        const target = section.items[0]?.href ?? "#";
        return (
          <Link
            key={section.label}
            href={target}
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? "page" : undefined}
            className={pillClass({ active: isActive })}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PortalNavL2({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const active = activeIndex(pathname, sections);
  if (active === -1) return null;
  const section = sections[active];
  if (section.items.length < 2) return null;

  const activeItem = activeItemIndex(pathname, section);
  const total = section.items.length;
  const positionLabel =
    activeItem >= 0 ? `${activeItem + 1} / ${total}` : `${total}`;

  return (
    <div>
      <nav
        className="flex items-center gap-2 min-w-0 overflow-x-auto scrollbar-hide -mx-1 px-1"
        role="tablist"
        aria-label={`${section.label} pages`}
      >
        {section.items.map((item) => {
          const itemActive = isActiveHref(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              role="tab"
              aria-selected={itemActive}
              aria-current={itemActive ? "page" : undefined}
              className={pillClass({ active: itemActive, size: "sm" })}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="mt-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {section.label} · {positionLabel}
      </p>
    </div>
  );
}
