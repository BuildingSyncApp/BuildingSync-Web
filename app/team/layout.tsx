import { requireTeam } from "@/lib/team";
import { PortalShell } from "@/components/PortalShell";
import type { NavSection, MobileNavItem } from "@/components/MobileMenu";
import { getNotifications } from "@/lib/notifications";
import { ReverificationBanner } from "@/components/ReverificationBanner";

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

  // L1 sections grouped by workflow. Each persona only sees the items
  // they're authorised for: concierge is read-only on most things and
  // doesn't manage units or post announcements; FM doesn't post
  // announcements, manage packages, or hire staff; only BM hires staff,
  // posts announcements, and sees the compliance surface.
  const isBM = appUser.role === "building_manager";
  const isFM = appUser.role === "facility_manager";
  const isConcierge = appUser.role === "concierge";

  const operations: MobileNavItem[] = [
    { href: "/team/work-orders", label: "Work orders" },
    { href: "/team/incidents", label: "Incidents" },
  ];
  if (isBM || isConcierge) operations.push({ href: "/team/packages", label: "Packages" });

  const people: MobileNavItem[] = [{ href: "/team/residents", label: "Residents" }];
  if (isBM) people.push({ href: "/team/staff", label: "Staff" });

  const property: MobileNavItem[] = [];
  if (isBM || isFM) property.push({ href: "/team/units", label: "Units" });
  if (isBM) property.push({ href: "/team/announcements", label: "Announcements" });
  property.push({ href: "/team/documents", label: "Documents" });

  const compliance: MobileNavItem[] = [];
  if (isBM) {
    compliance.push({ href: "/team/policies", label: "Policies" });
    compliance.push({ href: "/team/legal", label: "Legal" });
    compliance.push({ href: "/team/access-requests", label: "Access" });
    compliance.push({ href: "/team/audit-log", label: "Audit log" });
    compliance.push({ href: "/team/verification", label: "Verification" });
    compliance.push({ href: "/team/license", label: "License" });
  }

  const sections: NavSection[] = [
    { label: "Operations", items: operations },
    { label: "People", items: people },
    { label: "Property", items: property },
  ];
  if (compliance.length > 0) sections.push({ label: "Compliance", items: compliance });

  return (
    <PortalShell
      portalLabel="Team"
      portalHome="/team"
      navSections={sections}
      userName={appUser.name}
      userEmail={authUser.email!}
      userRole={appUser.role}
      notifications={notifications}
    >
      {/* BM-only re-verification banner. Self-hides until the next
          review is within 60 days, so non-BM staff and freshly-
          verified BMs see nothing. */}
      {isBM && (
        <div className="px-4 md:px-6 pt-4 max-w-7xl mx-auto">
          <ReverificationBanner
            nextDueAt={appUser.nextVerificationDue}
            companyName={appUser.company}
            email={authUser.email!}
          />
        </div>
      )}
      {children}
    </PortalShell>
  );
}
