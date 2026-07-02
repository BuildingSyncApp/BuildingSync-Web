import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { toWireMaintenance } from "@/lib/me-mappers";

// /api/me/maintenance — the caller's maintenance requests (WorkOrders they
// opened). GET lists; POST submits a new one. Matches the MaintenanceRequest
// schema in public/openapi.yaml. Resident-submitted requests default to a 72h
// (normal) SLA, same as /api/work-orders.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_PRIORITY = "normal" as const;
const DEFAULT_SLA = "normal_72h" as const;
const SLA_HOURS = 72;

const CreateBody = z.object({
  title: z.string().trim().min(3).max(200),
  area: z.string().trim().max(80).optional(),
  description: z.string().trim().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getApiUser(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.workOrder.findMany({
    where: { openedById: session.appUser.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ requests: rows.map((w) => toWireMaintenance(w)) });
}

export async function POST(request: NextRequest) {
  const session = await getApiUser(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { appUser } = session;
  if (!appUser.buildingId) {
    return NextResponse.json(
      { error: "no_building_assigned", message: "Your account is not yet linked to a building." },
      { status: 409 },
    );
  }

  const parsed = CreateBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const unitRow = appUser.unitId
    ? await prisma.unit.findUnique({ where: { id: appUser.unitId }, select: { unitNumber: true } })
    : null;
  const unitLabel = unitRow?.unitNumber || appUser.unit || "—";

  const submittedAt = new Date();
  const slaDeadline = new Date(submittedAt.getTime() + SLA_HOURS * 60 * 60 * 1000);

  const workOrder = await prisma.workOrder.create({
    data: {
      id: randomUUID(),
      buildingId: appUser.buildingId,
      unit: unitLabel,
      openedById: appUser.id,
      issue: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: DEFAULT_PRIORITY,
      slaPolicy: DEFAULT_SLA,
      slaDeadline,
      submittedAt,
    },
  });

  return NextResponse.json(toWireMaintenance({ ...workOrder, area: parsed.data.area ?? null }), { status: 201 });
}
