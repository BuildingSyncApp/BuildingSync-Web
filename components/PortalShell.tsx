import Link from "next/link";
import { Wordmark } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileMenu, type MobileNavItem } from "@/components/MobileMenu";
import { SignOutButton } from "@/components/SignOutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { AccountMenu } from "@/components/AccountMenu";
import { roleLabel } from "@/components/RoleBadge";
import type { Notification } from "@/lib/notifications";

// Unified post-login chrome. Replaces three near-identical headers that had
// drifted (different z-index, /platform missing the mobile menu entirely,
// inconsistent sign-out patterns). One shell, three portals feed it the
// nav items + role appropriate to their surface.

export function PortalShell({
  portalLabel,
  portalHome,
  navItems,
  userName,
  userEmail,
  userRole,
  notifications,
  children,
}: {
  portalLabel: string;
  portalHome: string;
  navItems: MobileNavItem[];
  userName?: string | null;
  userEmail: string;
  userRole: string;
  // Optional — admin /platform doesn't surface a notification feed today.
  notifications?: Notification[];
  children: React.ReactNode;
}) {
  // The mobile drawer doubles as the account surface on small screens —
  // AccountMenu is desktop-only, so we surface the same email/role/signout
  // here in the drawer footer.
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

  // Default Account href derived from portal home (e.g. "/team" → "/team/account").
  // Falls back to "/dashboard/account" for portals without a custom account page.
  const accountHref = `${portalHome === "/" ? "/dashboard" : portalHome}/account`;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-40">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
            <Link href={portalHome} className="flex items-baseline gap-2 shrink-0">
              <Wordmark className="text-base" />
              <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                {portalLabel}
              </span>
            </Link>
            <nav className="hidden md:flex gap-5 text-sm min-w-0 overflow-x-auto scrollbar-hide">
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
              portalHome={portalHome}
              accountHref={accountHref}
            />
            <MobileMenu items={navItems} rightSlot={mobileFooter} />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
