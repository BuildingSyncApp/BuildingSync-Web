import { NextResponse } from "next/server";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { logAuditFireAndForget } from "@/lib/audit";

// Building-scoped Communications log export. Pulls every comms event
// in a date window and emits as CSV: announcements (broadcasts), work-
// order notes, incident records, and audit-log entries that match
// known communication actions. BM-only — used for LTB / RTA evidence,
// internal review, and AI-assisted summarisation.

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 90;
const MAX_ROWS_PER_TABLE = 5000;

type Row = {
  timestamp: string;
  channel: string;
  actorEmail: string;
  audience: string;
  subject: string;
  body: string;
  reference: string;
};

function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(rows: Row[]): string {
  const header = ["timestamp", "channel", "actor_email", "audience", "subject", "body", "reference"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.timestamp, r.channel, r.actorEmail, r.audience, r.subject, r.body, r.reference]
        .map(csvEscape)
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}

export async function GET(request: Request) {
  const { authUser, appUser } = await requireTeam();
  if (appUser.role !== "building_manager") {
    return NextResponse.json({ error: "Only the Building Manager can export communications." }, { status: 403 });
  }
  if (!appUser.buildingId) {
    return NextResponse.json({ error: "No building on your account." }, { status: 409 });
  }

  const url = new URL(request.url);
  const days = Math.max(1, Math.min(365, Number(url.searchParams.get("days") ?? DEFAULT_DAYS)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [announcements, workOrderNotes, incidents, auditEvents, building] = await Promise.all([
    prisma.announcement.findMany({
      where: { buildingId: appUser.buildingId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS_PER_TABLE,
      include: { author: { select: { email: true } } },
    }),
    prisma.workOrderNote.findMany({
      where: {
        workOrder: { buildingId: appUser.buildingId },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS_PER_TABLE,
      include: {
        author: { select: { email: true } },
        workOrder: { select: { id: true, issue: true, unit: true } },
      },
    }),
    prisma.incident.findMany({
      where: { buildingId: appUser.buildingId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS_PER_TABLE,
      include: { reportedBy: { select: { email: true } } },
    }),
    prisma.auditLog.findMany({
      where: {
        buildingId: appUser.buildingId,
        createdAt: { gte: since },
        action: { in: [
          "announcement.create",
          "announcement.delete",
          "incident.report",
          "incident.status_change",
          "delivery.log",
          "delivery.picked_up",
          "workorder.status_change",
          "workorder.update",
          "notification_prefs_update",
        ] },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS_PER_TABLE,
      include: { actor: { select: { email: true } } },
    }),
    prisma.building.findUnique({ where: { id: appUser.buildingId }, select: { name: true } }),
  ]);

  const rows: Row[] = [];

  for (const a of announcements) {
    rows.push({
      timestamp: a.createdAt.toISOString(),
      channel: "announcement",
      actorEmail: a.author?.email ?? "",
      audience: a.audience,
      subject: a.title,
      body: a.body,
      reference: a.id,
    });
  }

  for (const n of workOrderNotes) {
    rows.push({
      timestamp: n.createdAt.toISOString(),
      channel: "work_order_note",
      actorEmail: n.author?.email ?? "",
      audience: `work_order:${n.workOrder.id}`,
      subject: `${n.workOrder.issue}${n.workOrder.unit && n.workOrder.unit !== "—" ? ` (Unit ${n.workOrder.unit})` : ""}`,
      body: n.body,
      reference: n.workOrderId,
    });
  }

  for (const i of incidents) {
    rows.push({
      timestamp: i.createdAt.toISOString(),
      channel: "incident",
      actorEmail: i.reportedBy?.email ?? "",
      audience: `${i.type}/${i.severity}/${i.status}`,
      subject: i.title,
      body: i.description ?? "",
      reference: i.id,
    });
  }

  for (const ev of auditEvents) {
    rows.push({
      timestamp: ev.createdAt.toISOString(),
      channel: `audit:${ev.action}`,
      actorEmail: ev.actor?.email ?? ev.userEmail ?? "",
      audience: ev.resource,
      subject: ev.resourceId ?? "",
      body: ev.changes ? JSON.stringify(ev.changes) : "",
      reference: ev.id,
    });
  }

  rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  const csv = rowsToCsv(rows);
  const safeName = (building?.name ?? "building").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const filename = `comms-${safeName}-${days}d-${Date.now()}.csv`;

  logAuditFireAndForget({
    userId: appUser.id,
    userEmail: authUser.email,
    buildingId: appUser.buildingId,
    action: "communications.export",
    resource: "Communications",
    changes: { days, rowCount: rows.length },
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
