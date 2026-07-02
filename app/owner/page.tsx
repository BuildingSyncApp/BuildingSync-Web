import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/StatCard";
import { Reveal } from "@/components/Reveal";
import { formatRelative } from "@/lib/format";

// Owner overview — read-only investment dashboard for the building
// owner. Same widget primitives as /team, scoped to what an owner needs
// to trust their manager: occupancy, collections vs. charged, and
// operational load. No PII-heavy queues, no mutation.

const ACTIVE_WO_STATUSES = ["open", "in_progress", "scheduled"] as const;

// Server component — evaluated per request.
function requestDates() {
  const now = new Date();
  return {
    now,
    monthStart: new Date(now.getFullYear(), now.getMonth(), 1),
    yearStart: new Date(now.getFullYear(), 0, 1),
    monthLabel: now.toLocaleDateString("en-CA", { month: "long", year: "numeric" }),
  };
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

export default async function OwnerOverviewPage() {
  const { appUser } = await requireUser();
  const { now, monthStart, yearStart, monthLabel } = requestDates();
  const buildingId = appUser.buildingId;

  const [building, unitCount, occupiedUnits, chargedAgg, collectedMTD, collectedYTD, openWOs, completedWOsMTD, announcements] =
    buildingId
      ? await Promise.all([
          prisma.building.findUnique({ where: { id: buildingId } }).catch(() => null),
          prisma.unit.count({ where: { buildingId } }).catch(() => 0),
          prisma.lease
            .findMany({
              where: { buildingId, archivedAt: null, leaseStartDate: { lte: now }, leaseEndDate: { gte: now } },
              select: { unitId: true },
              distinct: ["unitId"],
            })
            .then((rows) => rows.length)
            .catch(() => 0),
          prisma.lease
            .aggregate({
              _sum: { rentAmountMonthly: true },
              where: { buildingId, archivedAt: null, leaseStartDate: { lte: now }, leaseEndDate: { gte: now } },
            })
            .catch(() => ({ _sum: { rentAmountMonthly: null } })),
          prisma.payment
            .aggregate({ _sum: { amount: true }, where: { buildingId, paidAt: { gte: monthStart } } })
            .catch(() => ({ _sum: { amount: null } })),
          prisma.payment
            .aggregate({ _sum: { amount: true }, where: { buildingId, paidAt: { gte: yearStart } } })
            .catch(() => ({ _sum: { amount: null } })),
          prisma.workOrder
            .count({ where: { buildingId, status: { in: [...ACTIVE_WO_STATUSES] } } })
            .catch(() => 0),
          prisma.workOrder
            .count({ where: { buildingId, status: { in: ["completed", "closed"] }, updatedAt: { gte: monthStart } } })
            .catch(() => 0),
          prisma.announcement
            .findMany({
              where: { buildingId, deletedAt: null },
              orderBy: { createdAt: "desc" },
              take: 4,
              select: { id: true, title: true, createdAt: true },
            })
            .catch(() => []),
        ])
      : [null, 0, 0, { _sum: { rentAmountMonthly: null } }, { _sum: { amount: null } }, { _sum: { amount: null } }, 0, 0, []];

  const charged = chargedAgg._sum.rentAmountMonthly ?? 0;
  const mtd = collectedMTD._sum.amount ?? 0;
  const ytd = collectedYTD._sum.amount ?? 0;
  const occupancyPct = unitCount > 0 ? Math.round((occupiedUnits / unitCount) * 100) : null;

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
      <div className="space-y-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Owner overview · {monthLabel}
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          {building ? building.name : "Your building"}
        </h1>
        {building ? (
          <p className="text-sm text-muted-foreground">
            {building.address}, {building.city}, {building.state} {building.zipCode}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your account isn&apos;t linked to a building yet. Ask your building manager.
          </p>
        )}
      </div>

      {building && (
        <>
          <Reveal className="mt-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Occupancy"
                value={occupancyPct !== null ? occupancyPct : "—"}
                format="percent"
                hint={unitCount > 0 ? `${occupiedUnits} of ${unitCount} units leased` : undefined}
              />
              <StatCard
                label="Collected this month"
                value={mtd}
                format="cad"
                hint={charged > 0 ? `of ${fmtMoney(charged)} charged` : "No active leases recorded"}
              />
              <StatCard label="Collected this year" value={ytd} format="cad" />
              <StatCard
                label="Maintenance"
                value={openWOs}
                hint={`open · ${completedWOsMTD} resolved this month`}
              />
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="mt-10 grid md:grid-cols-2 gap-8">
              <section>
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
                  Building updates
                </h2>
                {announcements.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-card border border-border rounded-md px-4 py-3">
                    No announcements posted yet.
                  </p>
                ) : (
                  <ul className="bg-card border border-border rounded-md divide-y divide-border">
                    {announcements.map((a) => (
                      <li key={a.id} className="px-4 py-3">
                        <div className="text-sm font-medium truncate">{a.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{formatRelative(a.createdAt)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
                  Coming to this portal
                </h2>
                <div className="bg-card border border-border rounded-md px-4 py-4 text-sm text-muted-foreground space-y-2">
                  <p>• Monthly statement packets (income &amp; expense) — R2</p>
                  <p>• Expense breakdown by category — R2</p>
                  <p>• Capital planning &amp; reserve view — R3</p>
                  <p className="pt-1 text-xs">
                    This overview is read-only; day-to-day operations stay with your building
                    manager.
                  </p>
                </div>
              </section>
            </div>
          </Reveal>
        </>
      )}
    </main>
  );
}
