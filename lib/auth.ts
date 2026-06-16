import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User as AuthUser } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import type { User as AppUser } from "@prisma/client";
import { findBuildingByInviteCode, normalizeInviteCode } from "@/lib/invite-code";
import { logAuditFireAndForget } from "@/lib/audit";
import { validatePostalAgainstBuilding } from "@/lib/postal";
import { resolveImpersonation } from "@/lib/impersonation-server";
import type { ImpersonationSession } from "@/lib/impersonation";

// Reads the Supabase session, then upserts the app-side User row keyed by
// the Supabase auth.uid. New signups land here as `resident` with no
// building/unit until a Building Manager assigns them — unless they
// signed up with a building invite code, in which case we auto-link.
export async function getOrCreateAppUser(): Promise<{ authUser: AuthUser; appUser: AppUser; impersonation?: ImpersonationSession } | null> {
  const supabase = await createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return null;

  // Pull signup metadata that we persist to the Prisma User row on
  // first creation. Subsequent logins don't overwrite these — users
  // can edit them in /dashboard/account.
  const meta = user.user_metadata ?? {};
  const signupExtras = {
    name: typeof meta.full_name === "string" ? meta.full_name : undefined,
    phone: typeof meta.phone === "string" && meta.phone ? meta.phone : undefined,
    region: typeof meta.region === "string" ? meta.region : undefined,
    postalCode: typeof meta.postal_code === "string" && meta.postal_code ? meta.postal_code : undefined,
    city: typeof meta.city === "string" && meta.city ? meta.city : undefined,
    latitude: typeof meta.latitude === "number" ? meta.latitude : undefined,
    longitude: typeof meta.longitude === "number" ? meta.longitude : undefined,
    company: typeof meta.company_name === "string" && meta.company_name ? meta.company_name : undefined,
    managerType: typeof meta.manager_type === "string" && meta.manager_type ? meta.manager_type : undefined,
    businessNumber: typeof meta.business_number === "string" && meta.business_number ? meta.business_number : undefined,
    licenseNumber: typeof meta.license_number === "string" && meta.license_number ? meta.license_number : undefined,
  };
  // BMs land as "resident" by default to avoid privilege escalation
  // via metadata. Platform admin promotes to "building_manager" after
  // verifying the business registration / CMRAO licence.
  let appUser = await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email },
    create: {
      id: user.id,
      email: user.email,
      role: "resident",
      ...signupExtras,
    },
  });

  // First-touch invite-code application. The signup flow stores the
  // code in Supabase user_metadata; we apply it here once and clear
  // the metadata so it can't be replayed if the user later joins a
  // different building.
  const rawCode = (user.user_metadata?.invite_code as string | undefined) ?? null;
  if (rawCode && !appUser.buildingId) {
    const code = normalizeInviteCode(rawCode);
    if (code.length === 6) {
      const building = await findBuildingByInviteCode(code);
      if (building) {
        appUser = await prisma.user.update({
          where: { id: appUser.id },
          data: { buildingId: building.id },
        });
        logAuditFireAndForget({
          userId: appUser.id,
          userEmail: appUser.email,
          buildingId: building.id,
          action: "invite_code.redeem",
          resource: "User",
          resourceId: appUser.id,
          changes: { code },
        });

        // Soft FSA cross-check: compare resident's signup postal
        // against the building's postal code. Mismatch is logged
        // for the BM to review — never blocks signup (the resident
        // may have just moved, or be subletting, or live nearby
        // but the building entry has an off-by-FSA postcode).
        if (appUser.postalCode) {
          const buildingForCheck = await prisma.building.findUnique({
            where: { id: building.id },
            select: { zipCode: true },
          }).catch(() => null);
          if (buildingForCheck?.zipCode) {
            const issue = validatePostalAgainstBuilding(
              appUser.postalCode,
              buildingForCheck.zipCode,
            );
            if (issue) {
              logAuditFireAndForget({
                userId: appUser.id,
                userEmail: appUser.email,
                buildingId: building.id,
                action: "invite_code.fsa_mismatch",
                resource: "User",
                resourceId: appUser.id,
                changes: {
                  residentPostal: appUser.postalCode,
                  buildingPostal: buildingForCheck.zipCode,
                  reason: issue.message,
                },
              });
            }
          }
        }
      }
    }
    await supabase.auth.updateUser({ data: { invite_code: null } }).catch(() => {});
  }

  // Admin "View as / impersonate" swap. Resolves to a target identity only
  // when the real session is an admin AND a valid signed token is present
  // (lib/impersonation-server). Every downstream guard (requireUser/Team/
  // PlatformAdmin, resolvePortalUrl) flows through this return, so all
  // access decisions follow the impersonated identity automatically.
  const impersonation = await resolveImpersonation(appUser).catch(() => null);
  if (impersonation) {
    return { authUser: user, appUser: impersonation.appUser, impersonation: impersonation.session };
  }

  return { authUser: user, appUser };
}

export async function requireUser() {
  const result = await getOrCreateAppUser();
  if (!result) redirect("/signin");
  return result;
}
