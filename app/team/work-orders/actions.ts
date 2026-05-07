"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { logAuditFireAndForget } from "@/lib/audit";

const Body = z.object({
  workOrderId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

type Result =
  | { ok: true; noteId: string }
  | { ok: false; error: string };

// Threaded notes are open to anyone on /team — BM, FM, and concierge can
// all comment so handover is visible to the next shift. Building-scope
// is enforced by checking the work-order's buildingId.
export async function addWorkOrderNote(_prev: unknown, formData: FormData): Promise<Result> {
  const session = await requireTeam();
  if (!session.appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  const parsed = Body.safeParse({
    workOrderId: formData.get("workOrderId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { workOrderId, body } = parsed.data;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: { id: true, buildingId: true },
  });
  if (!workOrder || workOrder.buildingId !== session.appUser.buildingId) {
    return { ok: false, error: "Work order not found in your building." };
  }

  const note = await prisma.workOrderNote.create({
    data: {
      workOrderId,
      authorId: session.appUser.id,
      body,
    },
  });

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "work_order.note_add",
    resource: "WorkOrder",
    resourceId: workOrderId,
    buildingId: session.appUser.buildingId,
    changes: { noteId: note.id, length: body.length },
  });

  revalidatePath("/team/work-orders");
  return { ok: true, noteId: note.id };
}
