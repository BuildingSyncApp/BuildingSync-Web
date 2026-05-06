import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
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

  const announcement = await prisma.announcement.create({
    data: {
      buildingId: appUser.buildingId,
      authorId: appUser.id,
      title: parsed.data.title,
      body: parsed.data.body,
    },
  });

  return NextResponse.json({ announcement }, { status: 201 });
}
