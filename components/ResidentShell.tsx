import Link from "next/link";
import { Wordmark } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileMenu, type MobileNavItem } from "@/components/MobileMenu";
import { SignOutButton } from "@/components/SignOutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { AccountMenu } from "@/components/AccountMenu";
import { MobileTabBar } from "@/components/MobileTabBar";
import { roleLabel } from "@/components/RoleBadge";
import type { NotificationItem } from "@/components/NotificationBell";
import { getLocale } from "@/lib/locale-server";

// Resident/tenant variant of PortalShell. Mirrors the v2 mobile design:
// no top header on mobile (each page renders its own dark hero); a
// fixed bottom-tab + FAB. Desktop keeps the standard top-nav so the
// experience scales up to wider screens. Notifications and account live
// in the bottom "Menu" tab on mobile, top-right on desktop.

export async function ResidentShell({
  navItems,
  userName,
  userEmail,
  userRole,
  notifications,
  children,
}: {
  navItems: MobileNavItem[];
  userName?: string | null;
  userEmail: string;
  userRole: string;
  notifications?: NotificationItem[];
  children: React.ReactNode;
}) {
  const mobileFooter = (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        {userName && (
          <div className="font-semibold text-foreground truncate">{userName}</div>
        )}
        <div className="text-foreground/85 truncate">{userEmail}</div>
        <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-accent">
          {roleLabel(userRole)}
        </div>
      </div>
      <SignOutButton fullWidth />
    </div>
  );

  const locale = await getLocale();

  return (
    <div className="min-h-dvh">
      {/* Top header — desktop only. Mobile hides it; the bottom tab bar
          and the page's own dark hero replace it per v2 design. */}
      <header className="hidden md:block border-b border-border bg-card/40 backdrop-blur sticky top-0 z-40">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
            <Link href="/dashboard" className="flex items-baseline gap-2 shrink-0">
              <Wordmark className="text-base" />
              <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Home
              </span>
            </Link>
            <nav className="flex gap-5 text-sm min-w-0 overflow-x-auto scrollbar-hide">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {notifications !== undefined && <NotificationBell items={notifications} />}
            <ThemeToggle />
            <AccountMenu
              name={userName}
              email={userEmail}
              role={userRole}
              portalHome="/dashboard"
              accountHref="/dashboard/account"
              locale={locale}
            />
            <MobileMenu items={navItems} rightSlot={mobileFooter} />
          </div>
        </div>
      </header>
      {children}
      <MobileTabBar />
    </div>
  );
}
