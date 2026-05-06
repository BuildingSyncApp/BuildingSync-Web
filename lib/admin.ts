import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { requireUser } from "@/lib/auth";

const ADMIN_ROLES: UserRole[] = ["building_manager", "facility_manager", "concierge"];

export async function requireRole(allowed: UserRole[]) {
  const session = await requireUser();
  if (!allowed.includes(session.appUser.role)) redirect("/dashboard");
  return session;
}

export async function requireAdmin() {
  return requireRole(ADMIN_ROLES);
}

export function canAssign(role: UserRole) {
  return role === "building_manager" || role === "facility_manager";
}
