"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { requirePlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { signImpersonation, isImpersonationConfigured } from "@/lib/impersonation";
import {
  getImpersonationContext,
  setImpersonationCookie,
  clearImpersonationCookie,
} from "@/lib/impersonation-server";

// Roles that role-mode preview can synthesize. Excludes admin (no upward
// escalation) and the unwired roles (PM/guest/etc. would just render the
// resident dashboard). User-mode can target any non-admin real user.
const ROLE_MODE_ROLES = [
  "building_manager",
  "facility_manager",
  "concierge",
  "resident",
  "tenant",
] as const;

function portalPathForRole(role: UserRole): string {
  if (role === "building_manager" || role === "facility_manager" || role === "concierge") {
    return "/team";
  }
  return "/dashboard";
}

function roleLabel(role: string): string {
  return role.replace(/_/g, " ");
}

const StartSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("user"), targetUserId: z.string().min(1) }),
  z.object({
    mode: z.literal("role"),
    role: z.enum(ROLE_MODE_ROLES),
    buildingId: z.string().min(1),
  }),
]);

export async function startImpersonation(formData: FormData): Promise<void> {
  // Gate on the REAL admin session (no cookie set yet — or, if one is,
  // the swapped role won't be admin and this bounces, forcing exit first).
  const { appUser: admin } = await requirePlatformAdmin();
  if (!isImpersonationConfigured()) {
    redirect("/platform/impersonate?error=not_configured");
  }

  const parsed = StartSchema.safeParse({
    mode: formData.get("mode"),
    targetUserId: formData.get("targetUserId") ?? undefined,
    role: formData.get("role") ?? undefined,
    buildingId: formData.get("buildingId") ?? undefined,
  });
  if (!parsed.success) redirect("/platform/impersonate?error=invalid");

  let token: string;
  let redirectPath: string;
  const auditChanges: Record<string, unknown> = { mode: parsed.data.mode };

  if (parsed.data.mode === "user") {
    if (parsed.data.targetUserId === admin.id) redirect("/platform/users?error=self");
    const target = await prisma.user.findUnique({
      where: { id: parsed.data.targetUserId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!target) redirect("/platform/users?error=not_found");
    if (target.role === "admin") redirect("/platform/users?error=no_admin");

    const targetLabel = `${target.name || target.email} (${roleLabel(target.role)})`;
    token = signImpersonation({
      mode: "user",
      adminId: admin.id,
      adminEmail: admin.email,
      targetUserId: target.id,
      role: target.role,
      targetLabel,
    });
    redirectPath = portalPathForRole(target.role);
    auditChanges.targetUserId = target.id;
    auditChanges.targetRole = target.role;
    auditChanges.targetLabel = targetLabel;
  } else {
    const building = await prisma.building.findUnique({
      where: { id: parsed.data.buildingId },
      select: { id: true, name: true },
    });
    if (!building) redirect("/platform/impersonate?error=no_building");

    const targetLabel = `${roleLabel(parsed.data.role)} @ ${building.name} (preview)`;
    token = signImpersonation({
      mode: "role",
      adminId: admin.id,
      adminEmail: admin.email,
      role: parsed.data.role,
      buildingId: building.id,
      targetLabel,
    });
    redirectPath = portalPathForRole(parsed.data.role);
    auditChanges.role = parsed.data.role;
    auditChanges.buildingId = building.id;
    auditChanges.targetLabel = targetLabel;
  }

  await setImpersonationCookie(token);
  // Awaited (not fire-and-forget) — impersonation start/stop must be on the
  // record before the swap takes effect.
  await logAudit({
    userId: admin.id,
    userEmail: admin.email,
    action: "admin.impersonate.start",
    resource: "User",
    resourceId: auditChanges.targetUserId ? String(auditChanges.targetUserId) : null,
    changes: auditChanges,
  });

  redirect(redirectPath);
}

export async function stopImpersonation(): Promise<void> {
  // Deliberately NOT gated by requirePlatformAdmin: while impersonating, the
  // resolved role isn't admin, so that guard would lock the admin out of
  // their own exit. Clearing the cookie is always safe.
  const ctx = await getImpersonationContext();
  await clearImpersonationCookie();
  if (ctx.active) {
    await logAudit({
      userId: ctx.adminId,
      userEmail: ctx.adminEmail,
      action: "admin.impersonate.stop",
      resource: "User",
      resourceId: ctx.targetUserId ?? null,
      changes: { mode: ctx.mode, targetLabel: ctx.targetLabel },
    });
  }
  redirect("/platform");
}
