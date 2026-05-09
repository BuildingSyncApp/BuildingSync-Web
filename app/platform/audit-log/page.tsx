import { requirePlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { AuditLogTable, type AuditRow } from "@/components/AuditLogTable";

// Cross-building audit feed for BuildingSync platform admins. Surfaces
// every recorded event across all buildings, with the building name
// shown on each row. Used to investigate verification decisions, role
// changes, and any platform-wide anomalies.

export default async function PlatformAuditLogPage() {
  await requirePlatformAdmin();

  const rows = (await prisma.auditLog
    .findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        actor: { select: { name: true, email: true } },
        building: { select: { id: true, name: true } },
      },
    })
    .catch((err) => {
      console.error("[platform/audit-log] auditLog.findMany failed", err);
      return [];
    })) as unknown as AuditRow[];

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-6xl mx-auto">
      <div className="space-y-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Platform admin
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Cross-building event stream. Every account change, verification decision, and high-value
          action is recorded here. Append-only for evidence purposes.
        </p>
      </div>

      <div className="mt-8">
        <AuditLogTable rows={rows} showBuilding />
      </div>

      {rows.length >= 300 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Showing the most recent 300 events across all buildings.
        </p>
      )}
    </main>
  );
}
