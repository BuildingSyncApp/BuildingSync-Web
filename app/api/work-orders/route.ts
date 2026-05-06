import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateBody = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
});

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

  const workOrder = await prisma.workOrder.create({
    data: {
      buildingId: appUser.buildingId,
      unitId: appUser.unitId,
      openedById: appUser.id,
      title: parsed.data.title,
      description: parsed.data.description,
    },
  });

  return NextResponse.json({ workOrder }, { status: 201 });
}
