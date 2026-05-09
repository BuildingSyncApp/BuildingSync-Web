import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ResidentShell } from "@/components/ResidentShell";
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

  // Desktop top-nav. On mobile the bottom-tab bar handles primary nav;
  // these still appear in the hamburger drawer for completeness.
  const navItems: MobileNavItem[] = [
    { href: "/dashboard/announcements", label: "Announcements" },
    { href: "/dashboard/amenities", label: "Amenities" },
    { href: "/dashboard/events", label: "Events" },
    { href: "/dashboard/deliveries", label: "Deliveries" },
    { href: "/dashboard/maintenance", label: "Maintenance" },
    { href: "/dashboard/documents", label: "Documents" },
    ...(appUser.role === "tenant"
      ? [{ href: "/dashboard/payments", label: "Pay rent" }]
      : []),
  ];

  return (
    <ResidentShell
      navItems={navItems}
      userName={appUser.name}
      userEmail={authUser.email!}
      userRole={appUser.role}
      notifications={notifications}
    >
      {children}
    </ResidentShell>
  );
}
