"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { provisionUserWithInvite } from "@/lib/auth-actions";
import { logAuditFireAndForget } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { impersonationWriteGuard } from "@/lib/impersonation-server";

const Body = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(["facility_manager", "concierge"]),
  name: z.string().trim().max(120).optional().nullable(),
});

type Result =
  | { ok: true; email: string; role: "facility_manager" | "concierge"; message: string }
  | { ok: false; error: string };

export async function addStaff(_prev: unknown, formData: FormData): Promise<Result> {
  const session = await requireTeam();
  if (!can(session.appUser, "staff.manage")) {
    return { ok: false, error: "Only Building Managers can hire facility managers and concierges." };
  }
  // Creates a real account + emails a set-password invite — never while impersonating.
  const impBlock = await impersonationWriteGuard({ irreversible: true });
  if (impBlock) return { ok: false, error: impBlock };
  if (!session.appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  const parsed = Body.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    name: ((formData.get("name") as string) || "").trim() || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { email, role, name } = parsed.data;

  // Existing user? Re-link to this building & role rather than re-creating —
  // mirrors the residents flow.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const before = { role: existing.role, buildingId: existing.buildingId };
    await prisma.user.update({
      where: { id: existing.id },
      data: { role, buildingId: session.appUser.buildingId, unitId: null, ...(name ? { name } : {}) },
    });
    logAuditFireAndForget({
      userId: session.appUser.id,
      userEmail: session.appUser.email,
      action: "staff.relink",
      resource: "User",
      resourceId: existing.id,
      buildingId: session.appUser.buildingId,
      changes: { before, after: { role, buildingId: session.appUser.buildingId } },
    });
    revalidatePath("/team/staff");
    return { ok: true, email, role, message: "Re-linked existing account." };
  }

  // New user — create a passwordless account + email a signed set-password
  // invite. The staff member chooses their own password via the link.
  const building = await prisma.building.findUnique({
    where: { id: session.appUser.buildingId },
    select: { name: true },
  });
  const provisioned = await provisionUserWithInvite({
    email,
    name,
    role,
    buildingId: session.appUser.buildingId,
    buildingName: building?.name ?? null,
    invitedByLabel: session.appUser.name ?? session.appUser.email,
  });
  if (!provisioned.ok) {
    return { ok: false, error: provisioned.error };
  }

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "staff.create",
    resource: "User",
    resourceId: provisioned.userId,
    buildingId: session.appUser.buildingId,
    changes: { email, role, name, buildingId: session.appUser.buildingId },
  });

  revalidatePath("/team/staff");
  return {
    ok: true,
    email,
    role,
    message: "Staff account created and an invite email sent.",
  };
}

const RoleChangeBody = z.object({
  userId: z.string().min(1),
  role: z.enum(["facility_manager", "concierge"]),
});

type SimpleResult = { ok: true } | { ok: false; error: string };

// BM flips an existing staff member between facility_manager and concierge.
// Doesn't touch the auth user — just the app User.role + audit trail.
export async function changeStaffRole(_prev: unknown, formData: FormData): Promise<SimpleResult> {
  const session = await requireTeam();
  if (!can(session.appUser, "staff.manage")) {
    return { ok: false, error: "Only Building Managers can change staff roles." };
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return { ok: false, error: impBlock };
  if (!session.appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  const parsed = RoleChangeBody.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { userId, role } = parsed.data;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, buildingId: true, email: true },
  });
  if (!target || target.buildingId !== session.appUser.buildingId) {
    return { ok: false, error: "Staff member not found in your building." };
  }
  if (target.role !== "facility_manager" && target.role !== "concierge") {
    return { ok: false, error: "This action only re-roles facility managers and concierges." };
  }
  if (target.role === role) {
    return { ok: true };
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "staff.role_change",
    resource: "User",
    resourceId: userId,
    buildingId: session.appUser.buildingId,
    changes: { email: target.email, before: { role: target.role }, after: { role } },
  });

  revalidatePath("/team/staff");
  return { ok: true };
}

const ArchiveBody = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().max(280).optional().nullable(),
});

// Soft delete — sets archivedAt + archiveReason and detaches from the
// building. The User row stays so the audit log can still resolve
// historical actions; BM can re-add by email if it was a mistake.
export async function archiveStaff(_prev: unknown, formData: FormData): Promise<SimpleResult> {
  const session = await requireTeam();
  if (!can(session.appUser, "staff.manage")) {
    return { ok: false, error: "Only Building Managers can deactivate staff." };
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return { ok: false, error: impBlock };
  if (!session.appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  const parsed = ArchiveBody.safeParse({
    userId: formData.get("userId"),
    reason: ((formData.get("reason") as string) || "").trim() || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { userId, reason } = parsed.data;

  if (userId === session.appUser.id) {
    return { ok: false, error: "You can't deactivate your own account here." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, buildingId: true, email: true, archivedAt: true },
  });
  if (!target || target.buildingId !== session.appUser.buildingId) {
    return { ok: false, error: "Staff member not found in your building." };
  }
  if (target.role !== "facility_manager" && target.role !== "concierge") {
    return { ok: false, error: "This action only archives facility managers and concierges." };
  }
  if (target.archivedAt) {
    return { ok: true };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { archivedAt: new Date(), archiveReason: reason ?? null, buildingId: null },
  });

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "staff.archive",
    resource: "User",
    resourceId: userId,
    buildingId: session.appUser.buildingId,
    changes: { email: target.email, role: target.role, reason: reason ?? null },
  });

  revalidatePath("/team/staff");
  return { ok: true };
}
