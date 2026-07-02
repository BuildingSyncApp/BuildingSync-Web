"use server";

import { randomUUID } from "node:crypto";
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
  role: z.enum(["resident", "tenant"]),
  unitId: z.string().nullable(),
});

type Result =
  | { ok: true; email: string; message: string }
  | { ok: false; error: string };

export async function addResident(_prev: unknown, formData: FormData): Promise<Result> {
  const session = await requireTeam();
  if (!can(session.appUser, "resident.manage")) {
    return { ok: false, error: "Only Building Managers and Facility Managers can add residents." };
  }
  // Creates a real account + emails a set-password invite — never while impersonating.
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
    return { ok: true, email, message: `Re-linked existing account.` };
  }

  // New user — create a passwordless account + email a signed set-password
  // invite (lib/auth-actions). The resident chooses their own password via
  // the link; we never generate or email a plaintext password.
  const building = await prisma.building.findUnique({
    where: { id: session.appUser.buildingId },
    select: { name: true },
  });
  const provisioned = await provisionUserWithInvite({
    email,
    role,
    buildingId: session.appUser.buildingId,
    unitId,
    buildingName: building?.name ?? null,
    invitedByLabel: session.appUser.name ?? session.appUser.email,
  });
  if (!provisioned.ok) {
    return { ok: false, error: provisioned.error };
  }

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "user.create",
    resource: "User",
    resourceId: provisioned.userId,
    buildingId: session.appUser.buildingId,
    changes: { email, role, buildingId: session.appUser.buildingId, unitId },
  });

  revalidatePath("/team/residents");
  return {
    ok: true,
    email,
    message: "Account created and an invite email sent. They'll set their own password via the link.",
  };
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

type BulkRowOk = { row: number; email: string; status: "created" | "linked" };
type BulkRowErr = { row: number; email: string; error: string };
type BulkResult =
  | { ok: true; created: number; linked: number; rows: BulkRowOk[]; errors: BulkRowErr[] }
  | { ok: false; error: string };

export async function bulkAddResidents(_prev: unknown, formData: FormData): Promise<BulkResult> {
  const session = await requireTeam();
  if (!can(session.appUser, "resident.manage")) {
    return { ok: false, error: "Only Building Managers and Facility Managers can bulk-onboard residents." };
  }
  // Creates real accounts + emails set-password invites — never while impersonating.
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
      rows.push({ row: rowNum, email, status: "linked" });
      linked++;
      continue;
    }

    // New account + set-password invite email (sent inside provisionUser).
    const provisioned = await provisionUserWithInvite({
      email,
      role,
      buildingId: session.appUser.buildingId,
      unitId: linkData.unitId,
      buildingName: building?.name ?? null,
      invitedByLabel: session.appUser.name ?? session.appUser.email,
    });
    if (!provisioned.ok) {
      errors.push({ row: rowNum, email, error: provisioned.error });
      continue;
    }
    logAuditFireAndForget({
      userId: session.appUser.id,
      userEmail: session.appUser.email,
      action: "user.bulk_create",
      resource: "User",
      resourceId: provisioned.userId,
      buildingId: session.appUser.buildingId,
      changes: { email, ...linkData, row: rowNum },
    });
    rows.push({ row: rowNum, email, status: "created" });
    created++;
  }

  revalidatePath("/team/residents");
  return { ok: true, created, linked, rows, errors };
}

// ─── Offline payment recording ────────────────────────────────────────
// Rent/maintenance money often moves outside the app (e-transfer, cheque,
// cash at the office) — cheaper for the building than card processing.
// Recording those payments here keeps the collections dashboards truthful
// without forcing anyone through Stripe fees. BM-only: money stays a
// Building Manager concern (FM/concierge never see it).

const OfflinePaymentBody = z.object({
  leaseId: z.string().min(1),
  amount: z.coerce.number().positive().max(1_000_000),
  method: z.enum(["e_transfer", "cheque", "cash"]),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a payment date"),
});

type PaymentResult = { ok: true; message: string } | { ok: false; error: string };

export async function recordOfflinePayment(_prev: unknown, formData: FormData): Promise<PaymentResult> {
  const session = await requireTeam();
  if (session.appUser.role !== "building_manager") {
    return { ok: false, error: "Only Building Managers can record payments." };
  }
  const impBlock = await impersonationWriteGuard({});
  if (impBlock) return { ok: false, error: impBlock };
  if (!session.appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  const parsed = OfflinePaymentBody.safeParse({
    leaseId: formData.get("leaseId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    paidOn: formData.get("paidOn"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { leaseId, amount, method, paidOn } = parsed.data;

  const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
  if (!lease || lease.buildingId !== session.appUser.buildingId || lease.archivedAt) {
    return { ok: false, error: "Lease not found in your building." };
  }

  // Noon avoids the date sliding a day under timezone conversion.
  const paidAt = new Date(`${paidOn}T12:00:00`);
  if (Number.isNaN(paidAt.getTime())) return { ok: false, error: "Invalid payment date." };

  const paymentId = randomUUID();
  await prisma.payment.create({
    data: {
      id: paymentId,
      buildingId: lease.buildingId,
      userId: lease.tenantId,
      amount,
      currency: "CAD",
      status: "succeeded",
      method,
      paidAt,
    },
  });

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "payment.record_offline",
    resource: "Payment",
    resourceId: paymentId,
    buildingId: lease.buildingId,
    changes: { after: { leaseId, amount, method, paidOn } },
  });

  revalidatePath("/team/residents");
  revalidatePath("/team");
  return { ok: true, message: "Payment recorded." };
}
