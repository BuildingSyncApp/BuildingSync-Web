import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { User as AppUser } from "@prisma/client";
import { readSession } from "@/lib/session";
import { resolveImpersonation } from "@/lib/impersonation-server";
import type { ImpersonationSession } from "@/lib/impersonation";

// Minimal authenticated-identity shape. Callsites only ever read `.id` /
// `.email`, so a tiny local type is all that flows out of the auth layer.
export type SessionUser = { id: string; email: string };

// Reads our own signed session cookie (lib/session), then loads the app-side
// User row. The row is created at signup (lib/auth-actions registerUser) /
// at provisioning (provisionUserWithInvite), so by the time a valid session
// exists the row exists too. The upsert below is a defensive fallback that
// keeps a row in sync if one were ever missing.
export async function getOrCreateAppUser(): Promise<{ authUser: SessionUser; appUser: AppUser; impersonation?: ImpersonationSession } | null> {
  const session = await readSession();
  if (!session?.sub || !session.email) return null;

  const authUser: SessionUser = { id: session.sub, email: session.email };

  // Normal path: the row already exists. Fallback create covers the rare
  // case of a valid session with no row (e.g. a row deleted out-of-band);
  // such a user lands as a plain resident with no building until assigned.
  const appUser = await prisma.user.upsert({
    where: { id: authUser.id },
    update: { email: authUser.email },
    create: {
      id: authUser.id,
      email: authUser.email,
      role: "resident",
    },
  });

  // Admin "View as / impersonate" swap. Resolves to a target identity only
  // when the real session is an admin AND a valid signed token is present
  // (lib/impersonation-server). Every downstream guard (requireUser/Team/
  // PlatformAdmin, resolvePortalUrl) flows through this return, so all
  // access decisions follow the impersonated identity automatically.
  const impersonation = await resolveImpersonation(appUser).catch(() => null);
  if (impersonation) {
    return { authUser, appUser: impersonation.appUser, impersonation: impersonation.session };
  }

  return { authUser, appUser };
}

export async function requireUser() {
  const result = await getOrCreateAppUser();
  if (!result) redirect("/signin");
  return result;
}
