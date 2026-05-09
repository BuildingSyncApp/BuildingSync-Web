"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Mobile-only bottom-tab + center FAB. Mirrors the v2 mobile design:
// Home / Posts / Create (FAB) / Contacts / Menu. Hidden on md+ where the
// top-bar PortalShell handles navigation. Anchored above the safe-area
// inset so it doesn't disappear behind iOS home-indicator.

type Tab = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const TABS_LEFT: Tab[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5h-2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  },
  {
    href: "/dashboard/posts",
    label: "Posts",
    icon: <Icon d="M12 19V5 M5 12l7-7 7 7" />,
  },
];

const TABS_RIGHT: Tab[] = [
  {
    href: "/dashboard/contacts",
    label: "Contacts",
    icon: <Icon d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M19 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />,
  },
  {
    href: "/dashboard/menu",
    label: "Menu",
    icon: <Icon d="M3 6h18 M3 12h18 M3 18h18" />,
  },
];

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link
      href={tab.href}
      className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className="w-9 h-9 rounded-full flex items-center justify-center">
        {tab.icon}
      </span>
      <span className={`text-[11px] tracking-wide ${active ? "font-semibold" : "font-medium"}`}>
        {tab.label}
      </span>
    </Link>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Spacer so page content doesn't get hidden behind the fixed bar. */}
      <div className="md:hidden h-20" aria-hidden="true" />
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <div className="relative max-w-md mx-auto flex items-stretch px-2">
          {TABS_LEFT.map((tab) => (
            <TabLink key={tab.href} tab={tab} active={isActive(tab.href)} />
          ))}

          {/* Center FAB — Create. Sits raised above the bar. */}
          <div className="flex-1 flex flex-col items-center justify-end pb-2 pt-2">
            <Link
              href="/dashboard/create"
              aria-label="Create"
              className="-mt-7 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-900/20 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </Link>
            <span
              className={`mt-1 text-[11px] tracking-wide ${
                isActive("/dashboard/create") ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
              }`}
            >
              Create
            </span>
          </div>

          {TABS_RIGHT.map((tab) => (
            <TabLink key={tab.href} tab={tab} active={isActive(tab.href)} />
          ))}
        </div>
      </nav>
    </>
  );
}
