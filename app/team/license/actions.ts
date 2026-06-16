"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { verifyLicense } from "@/lib/license";
import { logAuditFireAndForget } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { impersonationWriteGuard } from "@/lib/impersonation-server";

export type LicenseActionResult = { ok: true } | { ok: false; error: string };

// Validate a pasted signed key. On success, upsert the License row for
// the user's building. BM-only — FM/concierge can't change subscription
// state.
export async function validateLicenseKey(formData: FormData): Promise<LicenseActionResult> {
  const { authUser, appUser } = await requireTeam();
  if (!can(appUser, "license.manage")) {
    return { ok: false, error: "Only the Building Manager can update the license." };
  }
  // Writes subscription/licensing state — never while impersonating.
  const impBlock = await impersonationWriteGuard({ irreversible: true });
  if (impBlock) return { ok: false, error: impBlock };
  if (!appUser.buildingId) {
    return { ok: false, error: "No building is associated with your account." };
  }

  const key = String(formData.get("key") || "").trim();
  if (!key) return { ok: false, error: "Paste a license key first." };

  const verified = verifyLicense(key);
  if (!verified.ok) return { ok: false, error: verified.error };

  const p = verified.payload;
  const id = randomUUID();
  await prisma.license.upsert({
    where: { buildingId: appUser.buildingId },
    update: {
      product: p.product ?? "BuildingSync SaaS",
      mode: p.mode ?? "saas",
      plan: p.plan ?? "essential",
      customer: p.customer,
      seatLimit: p.seatLimit ?? null,
      expiresAt: p.expiresAt ? new Date(p.expiresAt) : null,
      capabilities: p.capabilities ?? [],
      aiEnabled: Boolean(p.aiEnabled),
      signedPayload: key,
    },
    create: {
      id,
      buildingId: appUser.buildingId,
      product: p.product ?? "BuildingSync SaaS",
      mode: p.mode ?? "saas",
      plan: p.plan ?? "essential",
      customer: p.customer,
      seatLimit: p.seatLimit ?? null,
      expiresAt: p.expiresAt ? new Date(p.expiresAt) : null,
      capabilities: p.capabilities ?? [],
      aiEnabled: Boolean(p.aiEnabled),
      signedPayload: key,
    },
  });

  logAuditFireAndForget({
    userId: appUser.id,
    userEmail: authUser.email,
    buildingId: appUser.buildingId,
    action: "license_validate",
    resource: "License",
    resourceId: id,
    changes: {
      customer: p.customer,
      plan: p.plan,
      expiresAt: p.expiresAt ?? null,
    },
  });

  revalidatePath("/team/license");
  redirect("/team/license?validated=1");
}

// Send heartbeat — bumps lastHeartbeatAt. Used by on-prem deployments to
// confirm they're alive; SaaS uses it as a timestamp of "last touched".
export async function sendLicenseHeartbeat(): Promise<LicenseActionResult> {
  const { authUser, appUser } = await requireTeam();
  if (!can(appUser, "license.manage")) {
    return { ok: false, error: "Only the Building Manager can send the heartbeat." };
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return { ok: false, error: impBlock };
  if (!appUser.buildingId) {
    return { ok: false, error: "No building is associated with your account." };
  }

  const license = await prisma.license.findUnique({ where: { buildingId: appUser.buildingId } });
  if (!license) {
    return { ok: false, error: "No license on file. Validate a key first." };
  }

  await prisma.license.update({
    where: { id: license.id },
    data: { lastHeartbeatAt: new Date() },
  });

  logAuditFireAndForget({
    userId: appUser.id,
    userEmail: authUser.email,
    buildingId: appUser.buildingId,
    action: "license_heartbeat",
    resource: "License",
    resourceId: license.id,
  });

  revalidatePath("/team/license");
  return { ok: true };
}
