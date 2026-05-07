import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { requireUser } from "@/lib/auth";

// Building-side staff. Owners/managers of a single building manage their
// own residents + tenants here. The BuildingSync platform admin is a
// separate surface (lib/platform.ts) at admin.buildingsync.app.
const TEAM_ROLES: UserRole[] = ["building_manager", "facility_manager", "concierge"];

export async function requireRole(allowed: UserRole[]) {
  const session = await requireUser();
  if (!allowed.includes(session.appUser.role)) redirect("/dashboard");
  return session;
}

export async function requireTeam() {
  const session = await requireRole(TEAM_ROLES);
  // Building Manager accounts go through admin verification first. Without
  // this gate, an unverified BM could type /team in the URL bar and bypass
  // the sign-in routing redirect.
  if (session.appUser.role === "building_manager" && !session.appUser.verifiedAt) {
    redirect("/onboarding/pending");
  }
  return session;
}

export function canAssign(role: UserRole) {
  return role === "building_manager" || role === "facility_manager";
}
