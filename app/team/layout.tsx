import { requireTeam } from "@/lib/team";
import { PortalShell } from "@/components/PortalShell";
import type { MobileNavItem } from "@/components/MobileMenu";
import { getNotifications } from "@/lib/notifications";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const { authUser, appUser } = await requireTeam();
  const notifications = await getNotifications({
    id: appUser.id,
    role: appUser.role,
    buildingId: appUser.buildingId,
  }).catch((err) => {
    // Don't 500 the whole layout if the activity feed query fails.
    console.error("[team/layout] getNotifications failed", err);
    return [];
  });

  // Per-persona IA. Concierge is read-only on most things and doesn't manage
  // units or post announcements; FM doesn't post announcements or hire
  // staff; only BM hires staff and posts announcements. Account lives in
  // the AccountMenu dropdown for every persona, not in the main nav.
  const items: MobileNavItem[] = [
    { href: "/team/work-orders", label: "Work orders" },
    { href: "/team/incidents", label: "Incidents" },
    { href: "/team/residents", label: "Residents" },
  ];
  if (appUser.role === "building_manager") {
    items.push({ href: "/team/staff", label: "Staff" });
  }
  if (appUser.role === "building_manager" || appUser.role === "facility_manager") {
    items.push({ href: "/team/units", label: "Units" });
  }
  if (appUser.role === "building_manager") {
    items.push({ href: "/team/announcements", label: "Announcements" });
  }
  if (appUser.role === "concierge" || appUser.role === "building_manager") {
    items.push({ href: "/team/packages", label: "Packages" });
  }
  items.push({ href: "/team/documents", label: "Documents" });
  if (appUser.role === "building_manager") {
    items.push({ href: "/team/access-requests", label: "Access" });
    items.push({ href: "/team/audit-log", label: "Audit log" });
  }

  return (
    <PortalShell
      portalLabel="Team"
      portalHome="/team"
      navItems={items}
      userName={appUser.name}
      userEmail={authUser.email!}
      userRole={appUser.role}
      notifications={notifications}
    >
      {children}
    </PortalShell>
  );
}
