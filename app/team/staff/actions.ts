"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { logAuditFireAndForget } from "@/lib/audit";

// Server-side Supabase client with the SERVICE_ROLE key — required for
// auth.admin.createUser. Never expose this client to the browser.
function adminSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// Building Manager is the only role that can hire staff. FMs run operations
// but don't manage headcount; concierges have no admin powers at all.
const HIRING_ROLES = ["building_manager"];

const Body = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(["facility_manager", "concierge"]),
  name: z.string().trim().max(120).optional().nullable(),
});

type Result =
  | { ok: true; email: string; password: string | null; role: "facility_manager" | "concierge"; message: string }
  | { ok: false; error: string };

export async function addStaff(_prev: unknown, formData: FormData): Promise<Result> {
  const session = await requireTeam();
  if (!HIRING_ROLES.includes(session.appUser.role)) {
    return { ok: false, error: "Only Building Managers can hire facility managers and concierges." };
  }
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
    return { ok: true, email, password: null, role, message: "Re-linked existing account." };
  }

  // New user — create via Supabase admin API. email_confirm:true skips
  // Supabase's own confirmation; we send the branded welcome via Resend.
  const password = generatePassword();
  const supabase = adminSupabase();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user?.id) {
    return { ok: false, error: error?.message || "Supabase didn't return a user id." };
  }

  await prisma.user.create({
    data: {
      id: data.user.id,
      email,
      name: name ?? null,
      role,
      buildingId: session.appUser.buildingId,
    },
  });

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "staff.create",
    resource: "User",
    resourceId: data.user.id,
    buildingId: session.appUser.buildingId,
    changes: { email, role, name, buildingId: session.appUser.buildingId },
  });

  // Welcome email with temp password + sign-in link.
  const building = await prisma.building.findUnique({
    where: { id: session.appUser.buildingId },
    select: { name: true },
  });
  await sendEmail({
    to: email,
    ...welcomeEmail({ email, password, buildingName: building?.name ?? null, role }),
  });

  revalidatePath("/team/staff");
  return {
    ok: true,
    email,
    password,
    role,
    message: "Staff account created and welcome email sent.",
  };
}

function generatePassword(): string {
  return randomBytes(12).toString("base64").replace(/[+/=lI0Oo]/g, "").slice(0, 14);
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
  if (!HIRING_ROLES.includes(session.appUser.role)) {
    return { ok: false, error: "Only Building Managers can change staff roles." };
  }
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
// building. Auth user stays alive in Supabase so the audit log can still
// resolve historical actions; BM can re-add by email if it was a mistake.
export async function archiveStaff(_prev: unknown, formData: FormData): Promise<SimpleResult> {
  const session = await requireTeam();
  if (!HIRING_ROLES.includes(session.appUser.role)) {
    return { ok: false, error: "Only Building Managers can deactivate staff." };
  }
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
