"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { sendEmail, sendEmailFireAndForget, welcomeEmail } from "@/lib/email";
import { logAuditFireAndForget } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { impersonationWriteGuard } from "@/lib/impersonation-server";

// Server-side Supabase client with the SERVICE_ROLE key — required for
// auth.admin.createUser. Never expose this client to the browser.
// Returns null when the env var is missing so callers can surface a
// clear error instead of the supabase-js constructor throwing inside
// the server action (which surfaces as a generic 500 to the form).
function adminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const MISSING_SERVICE_KEY_ERROR =
  "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.";

const Body = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(["resident", "tenant"]),
  unitId: z.string().nullable(),
});

type Result =
  | { ok: true; email: string; password: string | null; message: string }
  | { ok: false; error: string };

export async function addResident(_prev: unknown, formData: FormData): Promise<Result> {
  const session = await requireTeam();
  if (!can(session.appUser, "resident.manage")) {
    return { ok: false, error: "Only Building Managers and Facility Managers can add residents." };
  }
  // Creates a real Supabase auth user + sends credentials — never while impersonating.
  const impBlock = await impersonationWriteGuard({ irreversible: true });
  if (impBlock) return { ok: false, error: impBlock };
  if (!session.appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  const parsed = Body.safeParse({
    email: formData.get("email"),
    role: formData.get("role") || "resident",
    unitId: (formData.get("unitId") as string) || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { email, role, unitId } = parsed.data;

  // If the unit was provided, verify it belongs to this building.
  if (unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit || unit.buildingId !== session.appUser.buildingId) {
      return { ok: false, error: "Unit doesn't belong to your building." };
    }
  }

  // Existing user? Re-link to this building/unit/role rather than re-creating.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const before = { role: existing.role, buildingId: existing.buildingId, unitId: existing.unitId };
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role,
        buildingId: session.appUser.buildingId,
        unitId: unitId,
      },
    });
    logAuditFireAndForget({
      userId: session.appUser.id,
      userEmail: session.appUser.email,
      action: "user.relink",
      resource: "User",
      resourceId: existing.id,
      buildingId: session.appUser.buildingId,
      changes: { before, after: { role, buildingId: session.appUser.buildingId, unitId } },
    });
    revalidatePath("/team/residents");
    return { ok: true, email, password: null, message: `Re-linked existing account.` };
  }

  // New user — create via Supabase admin API. email_confirm:true skips
  // Supabase's confirmation email; we send our own branded welcome via Resend.
  const password = generatePassword();
  const supabase = adminSupabase();
  if (!supabase) {
    return { ok: false, error: MISSING_SERVICE_KEY_ERROR };
  }
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
      role,
      buildingId: session.appUser.buildingId,
      unitId: unitId,
    },
  });

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "user.create",
    resource: "User",
    resourceId: data.user.id,
    buildingId: session.appUser.buildingId,
    changes: { email, role, buildingId: session.appUser.buildingId, unitId },
  });

  // Welcome email with temp password + sign-in link. Fire-and-forget so
  // a slow / failed Resend call never blocks the form — the BM still
  // sees the temp password in the success card and can share it
  // manually if email bounces (the response card has Copy buttons).
  const building = await prisma.building.findUnique({
    where: { id: session.appUser.buildingId },
    select: { name: true },
  });
  sendEmailFireAndForget({
    to: email,
    ...welcomeEmail({ email, password, buildingName: building?.name ?? null, role }),
  });

  revalidatePath("/team/residents");
  return {
    ok: true,
    email,
    password,
    message: "Account created and welcome email sent. Share the temporary password if email doesn't arrive.",
  };
}

function generatePassword(): string {
  // 14-char alphanumeric, easy to share verbally / over chat.
  return randomBytes(12).toString("base64").replace(/[+/=lI0Oo]/g, "").slice(0, 14);
}

// ─── Leases ──────────────────────────────────────────────────────────────

const LeaseBody = z.object({
  tenantId: z.string().min(1),
  unitId: z.string().min(1),
  leaseStartDate: z.string().min(1),
  leaseEndDate: z.string().min(1),
  rentAmountMonthly: z.coerce.number().positive().max(1_000_000),
  securityDeposit: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
  leaseType: z.enum(["fixed_term", "month_to_month"]).default("fixed_term"),
});

type LeaseResult = { ok: true; leaseId: string } | { ok: false; error: string };

// Active lease per tenant+unit. Required for the rent flow (Stripe checkout
// reads rentAmountMonthly) and for landlord-tenant notice forms (N4/N12
// pre-fill from the latest lease).
export async function addLease(_prev: unknown, formData: FormData): Promise<LeaseResult> {
  const session = await requireTeam();
  if (!can(session.appUser, "resident.manage")) {
    return { ok: false, error: "Only Building Managers and Facility Managers can record leases." };
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return { ok: false, error: impBlock };
  if (!session.appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  const parsed = LeaseBody.safeParse({
    tenantId: formData.get("tenantId"),
    unitId: formData.get("unitId"),
    leaseStartDate: formData.get("leaseStartDate"),
    leaseEndDate: formData.get("leaseEndDate"),
    rentAmountMonthly: formData.get("rentAmountMonthly"),
    securityDeposit: formData.get("securityDeposit") || null,
    leaseType: (formData.get("leaseType") as string) || "fixed_term",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { tenantId, unitId, leaseStartDate, leaseEndDate, rentAmountMonthly, securityDeposit, leaseType } = parsed.data;

  const start = new Date(leaseStartDate);
  const end = new Date(leaseEndDate);
  if (end <= start) {
    return { ok: false, error: "End date must be after start date." };
  }

  const [tenant, unit] = await Promise.all([
    prisma.user.findUnique({ where: { id: tenantId }, select: { id: true, buildingId: true, role: true, email: true } }),
    prisma.unit.findUnique({ where: { id: unitId }, select: { id: true, buildingId: true } }),
  ]);
  if (!tenant || tenant.buildingId !== session.appUser.buildingId) {
    return { ok: false, error: "Tenant not found in your building." };
  }
  if (!unit || unit.buildingId !== session.appUser.buildingId) {
    return { ok: false, error: "Unit not found in your building." };
  }
  if (tenant.role !== "tenant" && tenant.role !== "resident") {
    return { ok: false, error: "Leases can only be recorded for residents and tenants." };
  }

  const lease = await prisma.lease.create({
    data: {
      id: randomUUID(),
      buildingId: session.appUser.buildingId,
      tenantId,
      unitId,
      leaseStartDate: start,
      leaseEndDate: end,
      rentAmountMonthly,
      securityDeposit: securityDeposit ?? null,
      leaseType,
      status: "active",
    },
  });

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "lease.create",
    resource: "Lease",
    resourceId: lease.id,
    buildingId: session.appUser.buildingId,
    changes: {
      tenantEmail: tenant.email,
      unitId,
      leaseStartDate: start.toISOString(),
      leaseEndDate: end.toISOString(),
      rentAmountMonthly,
      leaseType,
    },
  });

  revalidatePath("/team/residents");
  return { ok: true, leaseId: lease.id };
}

const ArchiveLeaseBody = z.object({
  leaseId: z.string().min(1),
  reason: z.string().trim().max(280).optional().nullable(),
});

export async function archiveLease(_prev: unknown, formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireTeam();
  if (!can(session.appUser, "resident.manage")) {
    return { ok: false, error: "Only Building Managers and Facility Managers can end leases." };
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return { ok: false, error: impBlock };
  if (!session.appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  const parsed = ArchiveLeaseBody.safeParse({
    leaseId: formData.get("leaseId"),
    reason: ((formData.get("reason") as string) || "").trim() || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { leaseId, reason } = parsed.data;

  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    select: { id: true, buildingId: true, archivedAt: true, tenantId: true },
  });
  if (!lease || lease.buildingId !== session.appUser.buildingId) {
    return { ok: false, error: "Lease not found in your building." };
  }
  if (lease.archivedAt) return { ok: true };

  await prisma.lease.update({
    where: { id: leaseId },
    data: { archivedAt: new Date(), archiveReason: reason ?? null, status: "ended" },
  });

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "lease.archive",
    resource: "Lease",
    resourceId: leaseId,
    buildingId: session.appUser.buildingId,
    changes: { tenantId: lease.tenantId, reason: reason ?? null },
  });

  revalidatePath("/team/residents");
  return { ok: true };
}

// ─── Bulk CSV onboarding ────────────────────────────────────────────────

const CSV_ROLE_DEFAULT: "resident" | "tenant" = "resident";

type BulkRowOk = { row: number; email: string; password: string | null; status: "created" | "linked" };
type BulkRowErr = { row: number; email: string; error: string };
type BulkResult =
  | { ok: true; created: number; linked: number; rows: BulkRowOk[]; errors: BulkRowErr[] }
  | { ok: false; error: string };

export async function bulkAddResidents(_prev: unknown, formData: FormData): Promise<BulkResult> {
  const session = await requireTeam();
  if (!can(session.appUser, "resident.manage")) {
    return { ok: false, error: "Only Building Managers and Facility Managers can bulk-onboard residents." };
  }
  // Creates real Supabase auth users + sends credentials — never while impersonating.
  const impBlock = await impersonationWriteGuard({ irreversible: true });
  if (impBlock) return { ok: false, error: impBlock };
  if (!session.appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  // Accept either a pasted textarea or an uploaded .csv file.
  let text = (formData.get("csv") as string | null) ?? "";
  const file = formData.get("file") as File | null;
  if (file && typeof file === "object" && "text" in file) {
    const fromFile = await file.text();
    if (fromFile.trim()) text = fromFile;
  }
  if (!text.trim()) {
    return { ok: false, error: "Paste CSV rows or upload a .csv file." };
  }

  // Build a unitNumber → unitId lookup so we don't hit Prisma per row.
  const units = await prisma.unit.findMany({
    where: { buildingId: session.appUser.buildingId },
    select: { id: true, unitNumber: true },
  });
  const unitByNumber = new Map(units.map((u) => [u.unitNumber.toLowerCase(), u.id]));

  const supabase = adminSupabase();
  if (!supabase) {
    return { ok: false, error: MISSING_SERVICE_KEY_ERROR };
  }
  const building = await prisma.building.findUnique({
    where: { id: session.appUser.buildingId },
    select: { name: true },
  });

  const rows: BulkRowOk[] = [];
  const errors: BulkRowErr[] = [];
  let created = 0;
  let linked = 0;

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Skip a header row if present.
  const startIdx = lines[0]?.toLowerCase().startsWith("email") ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const rowNum = i + 1;
    const cells = lines[i].split(",").map((c) => c.trim());
    const email = cells[0]?.toLowerCase() || "";
    const roleCell = (cells[1] || CSV_ROLE_DEFAULT).toLowerCase();
    const unitCell = cells[2] || "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNum, email, error: "missing or invalid email" });
      continue;
    }
    if (roleCell !== "resident" && roleCell !== "tenant") {
      errors.push({ row: rowNum, email, error: `invalid role "${roleCell}" (expected resident or tenant)` });
      continue;
    }
    const role = roleCell as "resident" | "tenant";
    const unitId = unitCell ? unitByNumber.get(unitCell.toLowerCase()) ?? null : null;
    if (unitCell && !unitId) {
      errors.push({ row: rowNum, email, error: `unit "${unitCell}" not found in this building` });
      continue;
    }

    const linkData = { role, buildingId: session.appUser.buildingId, unitId };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const before = { role: existing.role, buildingId: existing.buildingId, unitId: existing.unitId };
      await prisma.user.update({ where: { id: existing.id }, data: linkData });
      logAuditFireAndForget({
        userId: session.appUser.id,
        userEmail: session.appUser.email,
        action: "user.bulk_relink",
        resource: "User",
        resourceId: existing.id,
        buildingId: session.appUser.buildingId,
        changes: { before, after: linkData, row: rowNum },
      });
      rows.push({ row: rowNum, email, password: null, status: "linked" });
      linked++;
      continue;
    }

    const password = generatePassword();
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !data.user?.id) {
      errors.push({ row: rowNum, email, error: createError?.message || "createUser returned no user id" });
      continue;
    }
    await prisma.user.create({
      data: { id: data.user.id, email, ...linkData },
    });
    logAuditFireAndForget({
      userId: session.appUser.id,
      userEmail: session.appUser.email,
      action: "user.bulk_create",
      resource: "User",
      resourceId: data.user.id,
      buildingId: session.appUser.buildingId,
      changes: { email, ...linkData, row: rowNum },
    });
    // Fire welcome email; don't fail the row if it errors (BM still sees the temp password in the response).
    sendEmail({
      to: email,
      ...welcomeEmail({ email, password, buildingName: building?.name ?? null, role }),
    }).catch((err) => console.error("[bulk-onboard] welcome email failed", email, err));
    rows.push({ row: rowNum, email, password, status: "created" });
    created++;
  }

  revalidatePath("/team/residents");
  return { ok: true, created, linked, rows, errors };
}
