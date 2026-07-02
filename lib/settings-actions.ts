"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditFireAndForget } from "@/lib/audit";
import { destroySession } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Persist per-channel notification preferences. Server is the source of
// truth for what's saved; client just toggles + posts. SMS toggle is
// recorded even though no SMS provider is wired — when one lands the
// existing flag flips to honored.
export async function saveNotificationPreferences(formData: FormData): Promise<ActionResult> {
  const { authUser, appUser } = await requireUser();

  const email = formData.get("email") === "1";
  const sms = formData.get("sms") === "1";
  const inApp = formData.get("inApp") === "1";

  await prisma.user.update({
    where: { id: appUser.id },
    data: { notifyEmail: email, notifySms: sms, notifyInApp: inApp },
  });

  logAuditFireAndForget({
    userId: appUser.id,
    userEmail: authUser.email,
    buildingId: appUser.buildingId,
    action: "notification_prefs_update",
    resource: "User",
    resourceId: appUser.id,
    changes: { notifyEmail: email, notifySms: sms, notifyInApp: inApp },
  });

  revalidatePath("/team/settings");
  revalidatePath("/dashboard/settings");
  revalidatePath("/platform/settings");
  return { ok: true };
}

// Soft-archive: set archivedAt + archiveReason. Records (lease,
// payments, work orders) stay for the retention window required by
// LTB / RTA / building policy. Hard-delete happens out of band.
export async function requestAccountDeletion(): Promise<ActionResult | void> {
  const { authUser, appUser } = await requireUser();

  if (appUser.archivedAt) {
    return { ok: false, error: "Your account is already pending deletion." };
  }
  if (appUser.role === "admin") {
    return { ok: false, error: "Platform admins cannot self-delete from this surface." };
  }

  await prisma.user.update({
    where: { id: appUser.id },
    data: {
      archivedAt: new Date(),
      archiveReason: "user_requested_deletion",
      isActive: false,
    },
  });

  logAuditFireAndForget({
    userId: appUser.id,
    userEmail: authUser.email,
    buildingId: appUser.buildingId,
    action: "account_archive",
    resource: "User",
    resourceId: appUser.id,
    changes: { reason: "user_requested_deletion" },
  });

  // Clear the session cookie so the archived account can't keep using
  // its session.
  try {
    await destroySession();
  } catch (err) {
    console.error("[settings] sign-out after archive failed", err);
  }

  redirect("/?archived=1");
}
