import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  toWireAnnouncement,
  toWireBuilding,
  toWireDelivery,
  toWireMaintenance,
  toWirePayment,
} from "@/lib/me-mappers";

// GET /api/me/building — the aggregate launch read for the resident/tenant
// mobile surface. One round-trip returns building info, announcements,
// deliveries, the caller's maintenance requests, and (tenants) payment status.
// Matches the BuildingData schema in public/openapi.yaml. This is the endpoint
// the mobile app's getBuildingData() consumes.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getApiUser(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { appUser } = session;
  if (!appUser.buildingId) {
    return NextResponse.json(
      { error: "no_building_assigned", message: "Your account is not yet linked to a building." },
      { status: 409 },
    );
  }
  const buildingId = appUser.buildingId;
  const isTenant = appUser.role === "tenant";

  // Tenants don't see resident-only announcements; everyone sees "all".
  // (specific_units targeting is a finer filter we can layer on later.)
  const audienceIn: Prisma.EnumAnnouncementAudienceFilter["in"] = isTenant
    ? ["all", "tenants_only"]
    : ["all"];

  const [building, announcements, deliveries, maintenance, payment] = await Promise.all([
    prisma.building.findUnique({
      where: { id: buildingId },
      select: { id: true, name: true, address: true, city: true },
    }),
    prisma.announcement.findMany({
      where: { buildingId, deletedAt: null, audience: { in: audienceIn } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.delivery.findMany({
      where: { recipientUserId: appUser.id },
      orderBy: { receivedAt: "desc" },
      take: 20,
    }),
    prisma.workOrder.findMany({
      where: { openedById: appUser.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    isTenant
      ? prisma.payment.findFirst({
          where: { userId: appUser.id },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        })
      : Promise.resolve(null),
  ]);

  if (!building) {
    return NextResponse.json({ error: "building_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    building: toWireBuilding(building),
    announcements: announcements.map(toWireAnnouncement),
    deliveries: deliveries.map(toWireDelivery),
    maintenance: maintenance.map((w) => toWireMaintenance(w)),
    payment: toWirePayment(payment),
  });
}
