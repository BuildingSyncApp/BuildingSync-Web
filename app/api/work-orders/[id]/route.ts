import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PatchBody = z.object({
  status: z.enum(["open", "assigned", "in_progress", "closed"]).optional(),
  assignSelf: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getOrCreateAppUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { appUser } = session;
  if (!["building_manager", "facility_manager"].includes(appUser.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = PatchBody.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const wo = await prisma.workOrder.findUnique({ where: { id } });
  if (!wo) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (wo.buildingId !== appUser.buildingId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const data: { status?: typeof parsed.data.status; assignedToId?: string } = {};
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.assignSelf) data.assignedToId = appUser.id;

  const updated = await prisma.workOrder.update({ where: { id }, data });
  return NextResponse.json({ workOrder: updated });
}
