import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailFireAndForget, announcementBroadcastEmail } from "@/lib/email";

const Body = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  audience: z.enum(["all", "tenants_only", "specific_units"]).default("all"),
  targetUnitIds: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  const session = await getOrCreateAppUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { appUser } = session;
  if (appUser.role !== "building_manager") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!appUser.buildingId) {
    return NextResponse.json({ error: "no_building_assigned" }, { status: 409 });
  }

  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { title, body, audience, targetUnitIds } = parsed.data;

  // Building-scope check on targetUnitIds: every unit must belong to this
  // building. Prevents a BM from spamming a unit across buildings.
  if (audience === "specific_units") {
    if (targetUnitIds.length === 0) {
      return NextResponse.json({ error: "specific_units_no_units" }, { status: 400 });
    }
    const validCount = await prisma.unit.count({
      where: { id: { in: targetUnitIds }, buildingId: appUser.buildingId },
    });
    if (validCount !== targetUnitIds.length) {
      return NextResponse.json({ error: "unit_not_in_building" }, { status: 400 });
    }
  }

  const announcement = await prisma.announcement.create({
    data: {
      buildingId: appUser.buildingId,
      authorId: appUser.id,
      title,
      body,
      audience,
      targetUnitIds: audience === "specific_units" ? targetUnitIds : [],
    },
  });

  // Resolve recipient set based on audience.
  const recipientFilter: {
    buildingId: string;
    role: { in: ("resident" | "tenant")[] };
    isActive: true;
    unitId?: { in: string[] };
  } = {
    buildingId: appUser.buildingId,
    role: { in: audience === "tenants_only" ? ["tenant"] : ["resident", "tenant"] },
    isActive: true,
  };
  if (audience === "specific_units") {
    recipientFilter.unitId = { in: targetUnitIds };
  }

  const [recipients, building] = await Promise.all([
    prisma.user.findMany({ where: recipientFilter, select: { email: true } }),
    prisma.building.findUnique({ where: { id: appUser.buildingId }, select: { name: true } }),
  ]);
  if (recipients.length > 0) {
    sendEmailFireAndForget({
      to: recipients.map((r) => r.email),
      ...announcementBroadcastEmail({
        title: announcement.title,
        body: announcement.body,
        buildingName: building?.name ?? null,
        authorLabel: appUser.name || appUser.email,
      }),
    });
  }

  return NextResponse.json(
    { announcement, recipientCount: recipients.length },
    { status: 201 },
  );
}
