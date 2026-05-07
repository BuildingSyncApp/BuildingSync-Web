"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { logAuditFireAndForget } from "@/lib/audit";

// All team roles can report incidents (concierge is the most common
// reporter — front desk sees things first). BM/FM also report and resolve.
const REPORTING_ROLES = ["building_manager", "facility_manager", "concierge"];

// Status changes are limited to BM/FM. Concierge can report but not resolve.
const RESOLUTION_ROLES = ["building_manager", "facility_manager"];

const ReportBody = z.object({
  type: z.enum(["security", "safety", "noise", "damage", "other"]),
  severity: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  location: z.string().trim().max(120).optional().nullable(),
});

type ReportResult = { ok: true; incidentId: string } | { ok: false; error: string };

export async function reportIncident(_prev: unknown, formData: FormData): Promise<ReportResult> {
  const session = await requireTeam();
  if (!REPORTING_ROLES.includes(session.appUser.role)) {
    return { ok: false, error: "You don't have permission to report incidents." };
  }
  if (!session.appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  const parsed = ReportBody.safeParse({
    type: formData.get("type"),
    severity: formData.get("severity") || "medium",
    title: formData.get("title"),
    description: ((formData.get("description") as string) || "").trim() || null,
    location: ((formData.get("location") as string) || "").trim() || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const data = parsed.data;
  const incident = await prisma.incident.create({
    data: {
      buildingId: session.appUser.buildingId,
      reportedById: session.appUser.id,
      type: data.type,
      severity: data.severity,
      title: data.title,
      description: data.description,
      location: data.location,
    },
  });

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "incident.report",
    resource: "Incident",
    resourceId: incident.id,
    buildingId: session.appUser.buildingId,
    changes: {
      type: data.type,
      severity: data.severity,
      title: data.title,
      location: data.location,
    },
  });

  revalidatePath("/team/incidents");
  revalidatePath("/team");
  return { ok: true, incidentId: incident.id };
}

const StatusBody = z.object({
  incidentId: z.string().min(1),
  status: z.enum(["open", "in_progress", "resolved"]),
});

export async function updateIncidentStatus(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const session = await requireTeam();
  if (!RESOLUTION_ROLES.includes(session.appUser.role)) {
    return { ok: false, error: "Only Building Managers and Facility Managers can change incident status." };
  }

  const parsed = StatusBody.safeParse({
    incidentId: formData.get("incidentId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  // Building-scope check: BM/FM can only act on incidents in their building.
  const incident = await prisma.incident.findUnique({
    where: { id: parsed.data.incidentId },
    select: { id: true, buildingId: true, status: true },
  });
  if (!incident || incident.buildingId !== session.appUser.buildingId) {
    return { ok: false, error: "Incident not found in your building." };
  }

  await prisma.incident.update({
    where: { id: incident.id },
    data: {
      status: parsed.data.status,
      resolvedAt: parsed.data.status === "resolved" ? new Date() : null,
    },
  });

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "incident.status_change",
    resource: "Incident",
    resourceId: incident.id,
    buildingId: session.appUser.buildingId,
    changes: { from: incident.status, to: parsed.data.status },
  });

  revalidatePath("/team/incidents");
  revalidatePath("/team");
  return { ok: true, status: parsed.data.status };
}
