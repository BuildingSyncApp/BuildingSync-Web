import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailFireAndForget, workOrderCreatedEmail } from "@/lib/email";
import { sendPushToUsers } from "@/lib/push";

const CreateBody = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
});

// Default SLA for resident-submitted requests is 72h (normal). BM/FM
// can re-prioritize from /team/work-orders later.
const DEFAULT_PRIORITY = "normal" as const;
const DEFAULT_SLA = "normal_72h" as const;
const SLA_HOURS: Record<typeof DEFAULT_SLA, number> = {
  normal_72h: 72,
};

export async function GET() {
  const session = await getOrCreateAppUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const workOrders = await prisma.workOrder.findMany({
    where: { openedById: session.appUser.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ workOrders });
}

export async function POST(request: NextRequest) {
  const session = await getOrCreateAppUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { appUser } = session;
  if (!appUser.buildingId) {
    return NextResponse.json(
      { error: "no_building_assigned", message: "Your account is not yet linked to a building. Ask your Building Manager to assign you." },
      { status: 409 },
    );
  }

  const parsed = CreateBody.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  // Resolve unit text label — fall back to "—" if neither relation nor
  // legacy text label is set. The DB column is NOT NULL so we have to
  // give it something.
  const unitRow = appUser.unitId
    ? await prisma.unit.findUnique({ where: { id: appUser.unitId }, select: { unitNumber: true } })
    : null;
  const unitLabel = unitRow?.unitNumber || appUser.unit || "—";

  const submittedAt = new Date();
  const slaDeadline = new Date(submittedAt.getTime() + SLA_HOURS[DEFAULT_SLA] * 60 * 60 * 1000);

  const workOrder = await prisma.workOrder.create({
    data: {
      id: randomUUID(),
      buildingId: appUser.buildingId,
      unit: unitLabel,
      openedById: appUser.id,
      issue: parsed.data.title,
      description: parsed.data.description,
      priority: DEFAULT_PRIORITY,
      slaPolicy: DEFAULT_SLA,
      slaDeadline,
      submittedAt,
    },
  });

  // Notify FMs (and BMs as fallback) in this building. Fire-and-forget so
  // a slow Resend call never blocks the resident's submit.
  const [recipients, building] = await Promise.all([
    prisma.user.findMany({
      where: {
        buildingId: appUser.buildingId,
        role: { in: ["facility_manager", "building_manager"] },
        isActive: true,
      },
      select: { id: true, email: true, notifyEmail: true },
    }),
    prisma.building.findUnique({ where: { id: appUser.buildingId }, select: { name: true } }),
  ]);
  if (recipients.length > 0) {
    const emails = recipients.filter((r) => r.notifyEmail).map((r) => r.email);
    if (emails.length > 0) {
      sendEmailFireAndForget({
        to: emails,
        ...workOrderCreatedEmail({
          title: workOrder.issue,
          description: workOrder.description ?? "",
          openedByLabel: appUser.name || appUser.email,
          unitLabel: workOrder.unit === "—" ? null : workOrder.unit,
          buildingName: building?.name ?? null,
          workOrderId: workOrder.id,
        }),
      });
    }

    void sendPushToUsers(
      recipients.map((r) => r.id),
      {
        title: building?.name
          ? `${building.name}: new work order`
          : "New work order",
        body: workOrder.unit === "—"
          ? workOrder.issue
          : `Unit ${workOrder.unit} · ${workOrder.issue}`,
        url: "/team/work-orders",
        tag: `workorder-new-${workOrder.id}`,
      },
    ).catch((err) => console.error("[work-orders] push failed", err));
  }

  return NextResponse.json({ workOrder }, { status: 201 });
}
