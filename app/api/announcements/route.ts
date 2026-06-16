import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendEmailFireAndForget, announcementBroadcastEmail } from "@/lib/email";
import { sendPushToUsers } from "@/lib/push";
import { logAuditFireAndForget } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { impersonationWriteGuard } from "@/lib/impersonation-server";

const Body = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  audience: z.enum(["all", "tenants_only", "specific_units"]).default("all"),
  targetUnitIds: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  const session = await getApiUser(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { appUser } = session;
  if (!can(appUser, "announcement.post")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return NextResponse.json({ error: impBlock }, { status: 403 });
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
    prisma.user.findMany({ where: recipientFilter, select: { id: true, email: true, notifyEmail: true } }),
    prisma.building.findUnique({ where: { id: appUser.buildingId }, select: { name: true } }),
  ]);

  logAuditFireAndForget({
    userId: appUser.id,
    userEmail: appUser.email,
    action: "announcement.create",
    resource: "Announcement",
    resourceId: announcement.id,
    buildingId: appUser.buildingId,
    changes: {
      title,
      audience,
      targetUnitIds: audience === "specific_units" ? targetUnitIds : [],
      bodyLength: body.length,
      recipientCount: recipients.length,
    },
  });
  if (recipients.length > 0) {
    const emailRecipients = recipients.filter((r) => r.notifyEmail).map((r) => r.email);
    if (emailRecipients.length > 0) {
      sendEmailFireAndForget({
        to: emailRecipients,
        ...announcementBroadcastEmail({
          title: announcement.title,
          body: announcement.body,
          buildingName: building?.name ?? null,
          authorLabel: appUser.name || appUser.email,
        }),
      });
    }

    // Fire-and-forget Web Push to every recipient with an active
    // subscription. Honored even when notifyEmail is off — push is a
    // separate channel.
    void sendPushToUsers(
      recipients.map((r) => r.id),
      {
        title: building?.name ? `${building.name}: ${announcement.title}` : announcement.title,
        body: announcement.body.length > 200 ? `${announcement.body.slice(0, 197)}…` : announcement.body,
        url: "/dashboard/announcements",
        tag: `announcement-${announcement.id}`,
      },
    ).catch((err) => console.error("[announcements] sendPushToUsers failed", err));
  }

  return NextResponse.json(
    { announcement, recipientCount: recipients.length },
    { status: 201 },
  );
}
