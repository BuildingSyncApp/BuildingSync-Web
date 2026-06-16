import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { User as AppUser, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  IMPERSONATION_COOKIE,
  IMPERSONATION_TTL_SECONDS,
  verifyImpersonation,
  type ImpersonationContext,
  type ImpersonationSession,
} from "@/lib/impersonation";

// Non-null sentinel so a synthesized building_manager (role-mode preview)
// isn't bounced by the verifiedAt gate in lib/team.ts requireTeam.
const EPOCH_SENTINEL = new Date(0);

// Token-only view of the impersonation cookie, memoized once per request.
// Used by the banner (root layout — must not force auth) and by audit
// attribution. Does NOT confirm the live session is an admin — that
// authority check lives in resolveImpersonation, the single point that
// actually swaps identity. Reading a signed token here is safe: it can't
// be forged without the secret, and a stolen token can't apply a swap
// because resolveImpersonation rejects a non-admin session.
export const getImpersonationContext = cache(async (): Promise<ImpersonationContext> => {
  const token = (await cookies()).get(IMPERSONATION_COOKIE)?.value;
  if (!token) return { active: false };
  const res = verifyImpersonation(token);
  if (!res.ok) return { active: false };
  const p = res.payload;
  return {
    active: true,
    mode: p.mode,
    readOnly: p.mode === "role",
    adminId: p.adminId,
    adminEmail: p.adminEmail,
    targetLabel: p.targetLabel,
    targetUserId: p.targetUserId,
    role: p.role,
    buildingId: p.buildingId,
  };
});

// Authority-checked resolution. Returns the identity to swap to ONLY when
// the live session is an admin AND a valid token minted for that same
// admin is present. Called once from the getOrCreateAppUser chokepoint.
export async function resolveImpersonation(
  realAppUser: AppUser,
): Promise<{ appUser: AppUser; session: ImpersonationSession } | null> {
  if (realAppUser.role !== "admin") return null;

  const ctx = await getImpersonationContext();
  if (!ctx.active) return null;
  if (ctx.adminId !== realAppUser.id) return null; // token minted for a different admin

  const session: ImpersonationSession = {
    mode: ctx.mode,
    readOnly: ctx.readOnly,
    adminId: ctx.adminId,
    adminEmail: ctx.adminEmail,
    targetLabel: ctx.targetLabel,
  };

  if (ctx.mode === "user") {
    if (!ctx.targetUserId) return null;
    const target = await prisma.user.findUnique({ where: { id: ctx.targetUserId } });
    // No upward/lateral escalation into another admin; target must exist.
    if (!target || target.role === "admin") return null;
    return { appUser: target, session };
  }

  // mode "role" — READ-ONLY preview against a chosen real building.
  if (!ctx.role || ctx.role === "admin" || !ctx.buildingId) return null;
  const appUser: AppUser = {
    ...realAppUser,
    role: ctx.role as UserRole,
    buildingId: ctx.buildingId,
    unitId: null,
    verifiedAt: realAppUser.verifiedAt ?? EPOCH_SENTINEL,
  };
  return { appUser, session };
}

// Read-only / irreversible write guard for mutating actions + routes.
// Returns a user-facing message when the action must be blocked, else null.
// Reads the token-only context (cheap, memoized): role-mode is read-only,
// and irreversible side-effects are blocked under ANY impersonation.
export async function impersonationWriteGuard(
  opts: { irreversible?: boolean } = {},
): Promise<string | null> {
  const ctx = await getImpersonationContext();
  if (!ctx.active) return null;
  if (opts.irreversible) {
    return "This action can't run while viewing as another user — exit “View as” first.";
  }
  if (ctx.readOnly) {
    return "Read-only preview (View as role). Exit “View as” to make changes.";
  }
  return null;
}

export async function setImpersonationCookie(token: string): Promise<void> {
  (await cookies()).set(IMPERSONATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: IMPERSONATION_TTL_SECONDS,
    // host-only (no Domain) so it can't leak to www.* and clears cleanly
  });
}

export async function clearImpersonationCookie(): Promise<void> {
  (await cookies()).set(IMPERSONATION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
