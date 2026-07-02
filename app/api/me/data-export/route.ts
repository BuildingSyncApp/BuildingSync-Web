import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditFireAndForget } from "@/lib/audit";

// PIPEDA / GDPR Art. 20 data portability — JSON export of the user's
// own data. Pulls profile + everything keyed to userId across the
// schema. No third-party fetches; this is an SSR-side dump from
// Postgres so it can be served immediately.

export const dynamic = "force-dynamic";

export async function GET() {
  const { authUser, appUser } = await requireUser();

  const [
    profile,
    leases,
    workOrdersOpened,
    workOrderNotes,
    payments,
    announcements,
    documents,
    incidents,
    amenityBookings,
    posts,
    deliveries,
    auditLog,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: appUser.id },
      include: { unitRel: { select: { unitNumber: true, floor: true, wing: true } } },
    }),
    prisma.lease.findMany({ where: { tenantId: appUser.id } }),
    prisma.workOrder.findMany({ where: { openedById: appUser.id } }),
    prisma.workOrderNote.findMany({ where: { authorId: appUser.id } }),
    prisma.payment.findMany({ where: { userId: appUser.id } }),
    prisma.announcement.findMany({ where: { authorId: appUser.id } }),
    prisma.document.findMany({ where: { uploadedById: appUser.id } }),
    prisma.incident.findMany({ where: { reportedById: appUser.id } }),
    prisma.amenityBooking.findMany({ where: { userId: appUser.id } }),
    prisma.post.findMany({ where: { authorId: appUser.id } }),
    prisma.delivery.findMany({ where: { recipientUserId: appUser.id } }),
    prisma.auditLog.findMany({
      where: { userId: appUser.id },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const exportPayload = {
    exported_at: new Date().toISOString(),
    schema_version: "v1",
    notice:
      "This is a snapshot of personal data BuildingSync holds about your account. It includes data you authored or that is keyed to your user id. It does not include other users' data, even where you appear as a counterparty (e.g. work-order assignees other than yourself).",
    auth_user: {
      id: authUser.id,
      email: authUser.email,
      created_at: appUser.createdAt,
      last_sign_in_at: appUser.lastLoginAt,
    },
    profile,
    leases,
    work_orders_opened: workOrdersOpened,
    work_order_notes_authored: workOrderNotes,
    payments,
    announcements_authored: announcements,
    documents_uploaded: documents,
    incidents_reported: incidents,
    amenity_bookings: amenityBookings,
    posts_authored: posts,
    deliveries: deliveries,
    audit_log: auditLog,
  };

  logAuditFireAndForget({
    userId: appUser.id,
    userEmail: authUser.email,
    buildingId: appUser.buildingId,
    action: "data_export",
    resource: "User",
    resourceId: appUser.id,
  });

  const filename = `buildingsync-export-${appUser.id.slice(0, 8)}-${Date.now()}.json`;
  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
