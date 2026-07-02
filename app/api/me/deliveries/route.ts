import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { toWireDelivery } from "@/lib/me-mappers";

// GET /api/me/deliveries — packages addressed to the caller. Matches the
// Delivery schema in public/openapi.yaml.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getApiUser(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.delivery.findMany({
    where: { recipientUserId: session.appUser.id },
    orderBy: { receivedAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ deliveries: rows.map(toWireDelivery) });
}
