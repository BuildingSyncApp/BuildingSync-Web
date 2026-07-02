import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ResidentShell } from "@/components/ResidentShell";
import type { NavSection } from "@/components/MobileMenu";
import { getNotifications } from "@/lib/notifications";
import { AdvisoryBanner } from "@/components/AdvisoryBanner";
import { getResidentAdvisories } from "@/lib/resident-advisories";

const STAFF_ROLES = ["building_manager", "facility_manager", "concierge"] as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { authUser, appUser } = await requireUser();

  // Resident dashboard is for residents/tenants only — staff land on /team.
  // Done in the layout so sub-pages don't each have to re-check.
  if ((STAFF_ROLES as readonly string[]).includes(appUser.role)) redirect("/team");

  const [notifications, advisories] = await Promise.all([
    getNotifications({
      id: appUser.id,
      role: appUser.role,
      buildingId: appUser.buildingId,
    }).catch((err) => {
      console.error("[dashboard/layout] getNotifications failed", err);
      return [];
    }),
    getResidentAdvisories(appUser).catch((err) => {
      console.error("[dashboard/layout] getResidentAdvisories failed", err);
      return [];
    }),
  ]);

  // Two L1 sections that map to how residents actually think about the
  // app: shared building life vs. their own unit/account. Tenants
  // additionally get "Pay rent" inside My place. Mobile uses the bottom
  // tab bar for primary nav; this nav appears in the hamburger drawer.
  const sections: NavSection[] = [
    {
      label: "Building",
      items: [
        { href: "/dashboard/announcements", label: "Announcements" },
        { href: "/dashboard/amenities", label: "Amenities" },
        { href: "/dashboard/events", label: "Events" },
      ],
    },
    {
      label: "My place",
      items: [
        { href: "/dashboard/maintenance", label: "Maintenance" },
        { href: "/dashboard/deliveries", label: "Deliveries" },
        { href: "/dashboard/documents", label: "Documents" },
        ...(appUser.role === "tenant"
          ? [{ href: "/dashboard/payments", label: "Pay rent" }]
          : []),
      ],
    },
  ];

  return (
    <ResidentShell
      navSections={sections}
      userName={appUser.name}
      userEmail={authUser.email!}
      userRole={appUser.role}
      notifications={notifications}
    >
      {advisories.length > 0 && (
        <div className="px-4 md:px-6 pt-4 max-w-5xl mx-auto">
          <AdvisoryBanner items={advisories} />
        </div>
      )}
      {children}
    </ResidentShell>
  );
}
