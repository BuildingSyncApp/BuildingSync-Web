import { requirePlatformAdmin } from "@/lib/platform";
import { PortalShell } from "@/components/PortalShell";
import type { MobileNavItem } from "@/components/MobileMenu";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { authUser, appUser } = await requirePlatformAdmin();

  // Platform admin IA — Account lives in the AccountMenu, not the main nav.
  const items: MobileNavItem[] = [
    { href: "/platform", label: "Overview" },
    { href: "/platform/users", label: "Users" },
    { href: "/platform/buildings", label: "Buildings" },
    { href: "/platform/audit-log", label: "Audit log" },
  ];

  return (
    <PortalShell
      portalLabel="Platform"
      portalHome="/platform"
      navItems={items}
      userName={appUser.name}
      userEmail={authUser.email!}
      userRole={appUser.role}
    >
      {children}
    </PortalShell>
  );
}
