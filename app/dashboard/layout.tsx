import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PortalShell } from "@/components/PortalShell";
import type { MobileNavItem } from "@/components/MobileMenu";
import { getNotifications } from "@/lib/notifications";

const STAFF_ROLES = ["building_manager", "facility_manager", "concierge"] as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { authUser, appUser } = await requireUser();

  // Resident dashboard is for residents/tenants only — staff land on /team.
  // Done in the layout so sub-pages don't each have to re-check.
  if ((STAFF_ROLES as readonly string[]).includes(appUser.role)) redirect("/team");

  const notifications = await getNotifications({
    id: appUser.id,
    role: appUser.role,
    buildingId: appUser.buildingId,
  }).catch((err) => {
    console.error("[dashboard/layout] getNotifications failed", err);
    return [];
  });

  // Resident IA — Account lives in the AccountMenu dropdown.
  const navItems: MobileNavItem[] = [
    { href: "/dashboard/maintenance", label: "Maintenance" },
    { href: "/dashboard/announcements", label: "Announcements" },
    { href: "/dashboard/documents", label: "Documents" },
  ];

  return (
    <PortalShell
      portalLabel="Home"
      portalHome="/dashboard"
      navItems={navItems}
      userName={appUser.name}
      userEmail={authUser.email!}
      userRole={appUser.role}
      notifications={notifications}
    >
      {children}
    </PortalShell>
  );
}
