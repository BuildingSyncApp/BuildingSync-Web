import { redirect } from "next/navigation";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { AuditLogTable, type AuditRow } from "@/components/AuditLogTable";

// Building-scoped audit feed. Visible to BM only — FM/concierge see the
// work-order trail in /team/work-orders. Filters AuditLog by buildingId
// so a BM only sees activity in their own building.

export default async function TeamAuditLogPage() {
  const { appUser } = await requireTeam();
  if (appUser.role !== "building_manager") redirect("/team");
  if (!appUser.buildingId) redirect("/team");

  const rows = (await prisma.auditLog
    .findMany({
      where: { buildingId: appUser.buildingId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        actor: { select: { name: true, email: true } },
      },
    })
    .catch((err) => {
      console.error("[team/audit-log] auditLog.findMany failed", err);
      return [];
    })) as unknown as AuditRow[];

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
      <div className="space-y-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Building Manager
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Append-only record of account, work-order, and announcement changes in your building.
          Useful for LTB / RTA evidence and for tracking who did what, when.
        </p>
      </div>

      <div className="mt-8">
        <AuditLogTable rows={rows} showBuilding={false} />
      </div>

      {rows.length >= 200 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Showing the most recent 200 events. Older events remain in the database — export functionality lands later.
        </p>
      )}
    </main>
  );
}
