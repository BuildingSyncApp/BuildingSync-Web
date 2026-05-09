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
      <div className="space-y-3">
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
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/team/communications/export?days=90"
            download
            className="inline-flex items-center gap-2 px-4 py-2 sm:px-3 sm:py-1.5 rounded-md border border-border hover:bg-muted text-sm transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download comms log · 90 days
          </a>
          <a
            href="/api/team/communications/export?days=30"
            download
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border hover:bg-muted text-xs transition-colors"
          >
            30 days
          </a>
          <a
            href="/api/team/communications/export?days=365"
            download
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border hover:bg-muted text-xs transition-colors"
          >
            1 year
          </a>
        </div>
      </div>

      <div className="mt-8">
        <AuditLogTable rows={rows} showBuilding={false} />
      </div>

      {rows.length >= 200 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Showing the most recent 200 events. Use Download comms log above for full date-windowed history.
        </p>
      )}
    </main>
  );
}
