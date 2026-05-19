"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { logAuditFireAndForget } from "@/lib/audit";

// Approve / reject / re-verify a Building Manager. Approval creates a
// ManagerVerification history row (snapshot of company + financial
// facts at the time of review) and updates the User's denormalised
// lastVerifiedAt + nextVerificationDue cache.
//
// nextVerificationDue is computed as the soonest of:
//   • lastVerifiedAt + validForMonths (annual review by default)
//   • licenseExpiresAt - 60 days (CMRAO licence renewal buffer)
//   • insuranceExpiresAt - 60 days (E&O / fidelity bond renewal buffer)

const ApproveBody = z.object({
  userId: z.string().uuid(),
  decision: z.literal("approve"),
  validForMonths: z.coerce.number().int().min(1).max(36).default(12),
  notes: z.string().trim().max(500).optional().nullable(),
  evidenceUrl: z.string().trim().max(500).optional().nullable(),

  // Company snapshot — required.
  companyName: z.string().trim().min(1).max(120),
  managerType: z.string().trim().min(1).max(40),
  businessNumber: z.string().trim().max(20).optional().nullable(),
  licenseNumber: z.string().trim().max(20).optional().nullable(),
  licenseExpiresAt: z.string().trim().optional().nullable(),

  // Financial-management snapshot — optional but recommended.
  trustAccountBank: z.string().trim().max(120).optional().nullable(),
  insuranceCarrier: z.string().trim().max(120).optional().nullable(),
  insurancePolicyNum: z.string().trim().max(80).optional().nullable(),
  insuranceExpiresAt: z.string().trim().optional().nullable(),
  managesReserveFund: z.coerce.boolean().optional().default(false),
  fidelityBondAmount: z.coerce.number().min(0).max(100_000_000).optional().nullable(),
});

const RejectBody = z.object({
  userId: z.string().uuid(),
  decision: z.literal("reject"),
});

const Body = z.discriminatedUnion("decision", [ApproveBody, RejectBody]);

type Result = { ok: true; decision: "approve" | "reject" } | { ok: false; error: string };

function dateOrNull(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function computeNextDue(args: {
  lastVerifiedAt: Date;
  validForMonths: number;
  licenseExpiresAt: Date | null;
  insuranceExpiresAt: Date | null;
}): Date {
  const cycleEnd = new Date(args.lastVerifiedAt);
  cycleEnd.setMonth(cycleEnd.getMonth() + args.validForMonths);
  const candidates = [cycleEnd];
  const sixtyDays = 60 * 24 * 60 * 60 * 1000;
  if (args.licenseExpiresAt) candidates.push(new Date(args.licenseExpiresAt.getTime() - sixtyDays));
  if (args.insuranceExpiresAt) candidates.push(new Date(args.insuranceExpiresAt.getTime() - sixtyDays));
  return new Date(Math.min(...candidates.map((d) => d.getTime())));
}

export async function decideVerification(_prev: unknown, formData: FormData): Promise<Result> {
  const session = await requirePlatformAdmin();

  const raw: Record<string, FormDataEntryValue | null> = {};
  for (const [k, v] of formData.entries()) raw[k] = v;
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, email: true, role: true, verifiedAt: true, archivedAt: true },
  });
  if (!target) return { ok: false, error: "User not found." };
  if (target.role !== "building_manager") {
    return { ok: false, error: "Only Building Manager accounts go through verification." };
  }

  if (parsed.data.decision === "reject") {
    await prisma.user.update({
      where: { id: target.id },
      data: { archivedAt: new Date(), archiveReason: "verification_rejected" },
    });
    logAuditFireAndForget({
      userId: session.appUser.id,
      userEmail: session.appUser.email,
      action: "user.verify_reject",
      resource: "User",
      resourceId: target.id,
      changes: { email: target.email, role: target.role },
    });
    revalidatePath("/platform");
    revalidatePath("/platform/verifications");
    return { ok: true, decision: "reject" };
  }

  // ─── APPROVE ─────────────────────────────────────────────────
  const p = parsed.data;
  const reviewedAt = new Date();
  const licenseExpiresAt = dateOrNull(p.licenseExpiresAt);
  const insuranceExpiresAt = dateOrNull(p.insuranceExpiresAt);
  const validUntil = computeNextDue({
    lastVerifiedAt: reviewedAt,
    validForMonths: p.validForMonths,
    licenseExpiresAt,
    insuranceExpiresAt,
  });

  await prisma.$transaction([
    prisma.managerVerification.create({
      data: {
        id: randomUUID(),
        userId: target.id,
        reviewedById: session.appUser.id,
        reviewedAt,
        validUntil,
        status: "approved",
        notes: p.notes || null,
        evidenceUrl: p.evidenceUrl || null,
        companyName: p.companyName,
        managerType: p.managerType,
        businessNumber: p.businessNumber || null,
        licenseNumber: p.licenseNumber || null,
        licenseExpiresAt,
        trustAccountBank: p.trustAccountBank || null,
        insuranceCarrier: p.insuranceCarrier || null,
        insurancePolicyNum: p.insurancePolicyNum || null,
        insuranceExpiresAt,
        managesReserveFund: !!p.managesReserveFund,
        fidelityBondAmount: p.fidelityBondAmount ?? null,
      },
    }),
    prisma.user.update({
      where: { id: target.id },
      data: {
        verifiedAt: target.verifiedAt ?? reviewedAt,
        lastVerifiedAt: reviewedAt,
        nextVerificationDue: validUntil,
        // Keep cached company facts in sync with the latest snapshot.
        company: p.companyName,
        managerType: p.managerType,
        businessNumber: p.businessNumber || null,
        licenseNumber: p.licenseNumber || null,
      },
    }),
  ]);

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: target.verifiedAt ? "user.reverify" : "user.verify",
    resource: "User",
    resourceId: target.id,
    changes: {
      email: target.email,
      companyName: p.companyName,
      managerType: p.managerType,
      licenseExpiresAt: licenseExpiresAt?.toISOString() ?? null,
      insuranceExpiresAt: insuranceExpiresAt?.toISOString() ?? null,
      validUntil: validUntil.toISOString(),
    },
  });

  revalidatePath("/platform");
  revalidatePath("/platform/verifications");
  return { ok: true, decision: "approve" };
}
