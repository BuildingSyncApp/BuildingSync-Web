import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PortalShell } from "@/components/PortalShell";
import type { NavSection } from "@/components/MobileMenu";

// Owner portal — the investment view. Mirrors the category-standard
// owner-portal pattern: a read-only dashboard the building's management
// publishes to the asset owner (occupancy, collections, operations),
// distinct from the resident and staff surfaces. R1 is read-only;
// statement packets + income/expense breakdowns land in R2.

const STAFF_ROLES = ["building_manager", "facility_manager", "concierge"] as const;

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { authUser, appUser } = await requireUser();

  if (appUser.role !== "building_owner") {
    if ((STAFF_ROLES as readonly string[]).includes(appUser.role)) redirect("/team");
    if (appUser.role === "admin") redirect("/platform");
    redirect("/dashboard");
  }

  const sections: NavSection[] = [
    {
      label: "Portfolio",
      items: [{ href: "/owner", label: "Overview" }],
    },
  ];

  return (
    <PortalShell
      portalLabel="Owner"
      portalHome="/owner"
      navSections={sections}
      userName={appUser.name}
      userEmail={authUser.email!}
      userRole={appUser.role}
    >
      {children}
    </PortalShell>
  );
}
