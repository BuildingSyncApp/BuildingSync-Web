"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { logAuditFireAndForget } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { impersonationWriteGuard } from "@/lib/impersonation-server";
import {
  NOTICE_TEMPLATES,
  remediationDeadline,
  type NoticeType,
  type N4Payload,
  type N5Payload,
  type N12Payload,
} from "@/lib/notices";

type Ok = { ok: true };
type Err = { ok: false; error: string };
type Result<T = unknown> = (Ok & T) | Err;

export async function createNotice(formData: FormData): Promise<Result<{ id: string }> | void> {
  const { authUser, appUser } = await requireTeam();
  if (!can(appUser, "notice.manage")) {
    return { ok: false, error: "Only the Building Manager can create legal notices." };
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return { ok: false, error: impBlock };
  if (!appUser.buildingId) {
    return { ok: false, error: "No building on your account." };
  }

  const type = String(formData.get("type") || "") as NoticeType;
  if (!NOTICE_TEMPLATES[type]) return { ok: false, error: "Invalid notice type." };

  const tenantUserId = String(formData.get("tenantUserId") || "");
  if (!tenantUserId) return { ok: false, error: "Pick a tenant." };

  // Tenant must live in this building.
  const tenant = await prisma.user.findUnique({
    where: { id: tenantUserId },
    select: { id: true, buildingId: true, archivedAt: true },
  });
  if (!tenant || tenant.buildingId !== appUser.buildingId) {
    return { ok: false, error: "Tenant not found in your building." };
  }

  const lease = await prisma.lease.findFirst({
    where: { tenantId: tenant.id, buildingId: appUser.buildingId, archivedAt: null },
    orderBy: { leaseStartDate: "desc" },
  });

  let payload: N4Payload | N5Payload | N12Payload;
  if (type === "N4") {
    const monthlyRent = Number(formData.get("monthlyRent") || lease?.rentAmountMonthly || 0);
    const period = String(formData.get("arrearsPeriod") || "");
    const amount = Number(formData.get("arrearsAmount") || 0);
    if (!period || !Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: "Enter the rental period and arrears amount." };
    }
    payload = {
      monthlyRent,
      arrearsBreakdown: [{ period, amount }],
      totalOwing: amount,
      amountToVoid: amount,
    };
  } else if (type === "N5") {
    const reason = String(formData.get("reason") || "interference") as N5Payload["reason"];
    const incidentDate = String(formData.get("incidentDate") || "");
    const incidentDesc = String(formData.get("incidentDescription") || "").trim();
    const remedy = String(formData.get("remedyRequested") || "").trim();
    if (!incidentDate || !incidentDesc || !remedy) {
      return { ok: false, error: "Provide the incident details and the remedy required." };
    }
    payload = {
      reason,
      incidents: [{ date: incidentDate, description: incidentDesc }],
      remedyRequested: remedy,
      isSecondNoticeWithinSixMonths: formData.get("isSecondNotice") === "1",
    };
  } else {
    const beneficiary = String(formData.get("beneficiary") || "landlord") as N12Payload["beneficiary"];
    const beneficiaryName = String(formData.get("beneficiaryName") || "").trim();
    if (!beneficiaryName) {
      return { ok: false, error: "Name the person who will move in." };
    }
    payload = {
      beneficiary,
      beneficiaryName,
      compensationMonths: 1,
      affidavitAttached: formData.get("affidavitAttached") === "1",
    };
  }

  const id = randomUUID();
  await prisma.notice.create({
    data: {
      id,
      buildingId: appUser.buildingId,
      leaseId: lease?.id ?? null,
      tenantUserId: tenant.id,
      createdById: appUser.id,
      type,
      status: "draft",
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });

  logAuditFireAndForget({
    userId: appUser.id,
    userEmail: authUser.email,
    buildingId: appUser.buildingId,
    action: "notice.create",
    resource: "Notice",
    resourceId: id,
    changes: { type, tenantUserId },
  });

  revalidatePath("/team/legal/notices");
  redirect(`/team/legal/notices/${id}`);
}

export async function markNoticeServed(formData: FormData): Promise<Ok | Err | void> {
  const { authUser, appUser } = await requireTeam();
  if (!can(appUser, "notice.manage")) {
    return { ok: false, error: "Only the Building Manager can serve notices." };
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return { ok: false, error: impBlock };

  const id = String(formData.get("id") || "");
  const method = String(formData.get("method") || "in_person");
  const servedAtRaw = String(formData.get("servedAt") || "");
  const servedAt = servedAtRaw ? new Date(servedAtRaw) : new Date();
  if (Number.isNaN(servedAt.getTime())) {
    return { ok: false, error: "Invalid service date." };
  }

  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice || notice.buildingId !== appUser.buildingId) {
    return { ok: false, error: "Notice not found in your building." };
  }
  if (notice.status !== "draft") {
    return { ok: false, error: "This notice is already served or resolved." };
  }

  await prisma.notice.update({
    where: { id },
    data: {
      status: "served",
      servedAt,
      servedMethod: method,
      remediationBy: remediationDeadline(notice.type as NoticeType, servedAt),
    },
  });

  logAuditFireAndForget({
    userId: appUser.id,
    userEmail: authUser.email,
    buildingId: appUser.buildingId,
    action: "notice.serve",
    resource: "Notice",
    resourceId: id,
    changes: { method, servedAt: servedAt.toISOString() },
  });

  revalidatePath("/team/legal/notices");
  revalidatePath(`/team/legal/notices/${id}`);
  return { ok: true };
}

export async function withdrawNotice(formData: FormData): Promise<Ok | Err | void> {
  const { authUser, appUser } = await requireTeam();
  if (!can(appUser, "notice.manage")) {
    return { ok: false, error: "Only the Building Manager can withdraw notices." };
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return { ok: false, error: impBlock };
  const id = String(formData.get("id") || "");
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice || notice.buildingId !== appUser.buildingId) {
    return { ok: false, error: "Notice not found in your building." };
  }
  await prisma.notice.update({
    where: { id },
    data: { status: notice.status === "draft" ? "withdrawn" : "resolved" },
  });
  logAuditFireAndForget({
    userId: appUser.id,
    userEmail: authUser.email,
    buildingId: appUser.buildingId,
    action: "notice.withdraw",
    resource: "Notice",
    resourceId: id,
  });
  revalidatePath("/team/legal/notices");
  revalidatePath(`/team/legal/notices/${id}`);
  return { ok: true };
}

