import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendEmailFireAndForget, workOrderStatusChangedEmail } from "@/lib/email";
import { logAuditFireAndForget } from "@/lib/audit";
import { sendPushToUser } from "@/lib/push";
import { can } from "@/lib/permissions";
import { impersonationWriteGuard } from "@/lib/impersonation-server";

// Live-DB enum: open → in_progress → scheduled → completed → closed.
// We only expose the linear flow (open → in_progress → closed) for R1.
const PatchBody = z.object({
  status: z.enum(["open", "in_progress", "scheduled", "completed", "closed"]).optional(),
  assignSelf: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getApiUser(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { appUser } = session;
  if (!can(appUser, "workorder.manage")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return NextResponse.json({ error: impBlock }, { status: 403 });

  const { id } = await params;
  const parsed = PatchBody.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const wo = await prisma.workOrder.findUnique({ where: { id } });
  if (!wo) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (wo.buildingId !== appUser.buildingId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const data: { status?: typeof parsed.data.status; assigneeId?: string } = {};
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.assignSelf) data.assigneeId = appUser.id;

  const updated = await prisma.workOrder.update({ where: { id }, data });

  logAuditFireAndForget({
    userId: appUser.id,
    userEmail: appUser.email,
    action: data.status && data.status !== wo.status ? "workorder.status_change" : "workorder.update",
    resource: "WorkOrder",
    resourceId: id,
    buildingId: wo.buildingId,
    changes: {
      before: { status: wo.status, assigneeId: wo.assigneeId },
      after: { status: updated.status, assigneeId: updated.assigneeId },
    },
  });

  // Notify the opener if status actually changed (email + push).
  if (data.status && data.status !== wo.status && wo.openedById) {
    const openerId = wo.openedById;
    const [opener, building] = await Promise.all([
      prisma.user.findUnique({
        where: { id: openerId },
        select: { email: true, isActive: true, notifyEmail: true },
      }),
      prisma.building.findUnique({ where: { id: wo.buildingId }, select: { name: true } }),
    ]);
    if (opener?.isActive && opener.email) {
      if (opener.notifyEmail) {
        sendEmailFireAndForget({
          to: opener.email,
          ...workOrderStatusChangedEmail({
            title: updated.issue,
            oldStatus: wo.status,
            newStatus: data.status,
            buildingName: building?.name ?? null,
          }),
        });
      }
      void sendPushToUser(openerId, {
        title: building?.name
          ? `${building.name}: maintenance update`
          : "Maintenance update",
        body: `${updated.issue} → ${data.status.replace("_", " ")}`,
        url: "/dashboard/maintenance",
        tag: `workorder-${updated.id}`,
      }).catch((err) => console.error("[work-orders/[id]] push failed", err));
    }
  }

  return NextResponse.json({ workOrder: updated });
}
