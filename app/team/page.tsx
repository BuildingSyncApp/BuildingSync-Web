import Link from "next/link";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { StatusPill, workOrderTone, type Tone } from "@/components/StatusPill";
import { roleLabel } from "@/components/RoleBadge";
import { formatRelative } from "@/lib/format";
import { Reveal } from "@/components/Reveal";

// Command-center home for building staff, modelled on the patterns that
// make AppFolio's PM dashboard work: a portfolio strip (occupancy, rent
// collected MTD), an SLA-ordered work queue, and a "needs attention"
// list where every row deep-links to the surface that clears it.
// Everything is role-scoped: concierge sees packages, not money.

const ACTIVE_WO_STATUSES = ["open", "in_progress", "scheduled"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

// Server component — evaluated per request, so "now" is request time.
// Date math lives here (module scope) to keep the component body pure.
function requestDates() {
  const now = new Date();
  return {
    now,
    monthStart: new Date(now.getFullYear(), now.getMonth(), 1),
    leaseHorizon: new Date(now.getTime() + 60 * DAY_MS),
    todayLabel: now.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" }),
  };
}

function daysFrom(now: Date, date: Date): number {
  return Math.round((date.getTime() - now.getTime()) / DAY_MS);
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const PRIORITY_TONE: Record<string, Tone> = {
  urgent: "red",
  high: "amber",
  normal: "neutral",
  low: "muted",
};

type AttentionRow = {
  key: string;
  pill: { label: string; tone: Tone };
  text: string;
  meta: string;
  href: string;
};

export default async function TeamHome() {
  const { appUser } = await requireTeam();
  const { now, monthStart, leaseHorizon, todayLabel } = requestDates();

  const isBM = appUser.role === "building_manager";
  const isFM = appUser.role === "facility_manager";
  const isConcierge = appUser.role === "concierge";
  const buildingId = appUser.buildingId;

  // Each query .catch'd individually — one failure shouldn't 500 the page.
  const [
    building,
    unitCount,
    occupiedUnits,
    openCount,
    urgentCount,
    overdueCount,
    queueWorkOrders,
    collectedAgg,
    chargedAgg,
    pendingPackages,
    residentCount,
    pendingVerifications,
    expiringLeases,
    recentAnnouncements,
    newestResidents,
  ] = buildingId
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
        prisma.workOrder.count({ where: { buildingId, status: { in: [...ACTIVE_WO_STATUSES] } } }).catch(() => 0),
        prisma.workOrder
          .count({ where: { buildingId, status: { in: [...ACTIVE_WO_STATUSES] }, priority: "urgent" } })
          .catch(() => 0),
        prisma.workOrder
          .count({ where: { buildingId, status: { in: [...ACTIVE_WO_STATUSES] }, slaDeadline: { lt: now } } })
          .catch(() => 0),
        prisma.workOrder
          .findMany({
            where: { buildingId, status: { in: [...ACTIVE_WO_STATUSES] } },
            orderBy: { slaDeadline: "asc" }, // most at-risk first
            take: 5,
            include: {
              openedBy: { select: { name: true, email: true } },
              assignee: { select: { name: true, email: true } },
            },
          })
          .catch(() => []),
        isBM || isFM
          ? prisma.payment
              .aggregate({ _sum: { amount: true }, where: { buildingId, paidAt: { gte: monthStart } } })
              .catch(() => ({ _sum: { amount: null } }))
          : { _sum: { amount: null } },
        isBM || isFM
          ? prisma.lease
              .aggregate({
                _sum: { rentAmountMonthly: true },
                where: { buildingId, archivedAt: null, leaseStartDate: { lte: now }, leaseEndDate: { gte: now } },
              })
              .catch(() => ({ _sum: { rentAmountMonthly: null } }))
          : { _sum: { rentAmountMonthly: null } },
        prisma.delivery.count({ where: { buildingId, status: "pending" } }).catch(() => 0),
        prisma.user
          .count({ where: { buildingId, role: { in: ["resident", "tenant"] }, archivedAt: null } })
          .catch(() => 0),
        isBM
          ? prisma.user
              .findMany({
                where: {
                  buildingId,
                  verifiedAt: null,
                  archivedAt: null,
                  role: { in: ["facility_manager", "concierge", "resident", "tenant"] },
                },
                select: { id: true, name: true, email: true, role: true, createdAt: true },
                orderBy: { createdAt: "asc" },
                take: 3,
              })
              .catch(() => [])
          : [],
        isBM
          ? prisma.lease
              .findMany({
                where: { buildingId, archivedAt: null, leaseEndDate: { gte: now, lte: leaseHorizon } },
                orderBy: { leaseEndDate: "asc" },
                take: 2,
                include: { unit: { select: { unitNumber: true } } },
              })
              .catch(() => [])
          : [],
        prisma.announcement
          .findMany({
            where: { buildingId, deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: { id: true, title: true, createdAt: true },
          })
          .catch(() => []),
        prisma.user
          .findMany({
            where: { buildingId, role: { in: ["resident", "tenant"] }, archivedAt: null },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: { id: true, name: true, email: true, createdAt: true, unitRel: { select: { unitNumber: true } } },
          })
          .catch(() => []),
      ])
    : [null, 0, 0, 0, 0, 0, [], { _sum: { amount: null } }, { _sum: { rentAmountMonthly: null } }, 0, 0, [], [], [], []];

  const collected = collectedAgg._sum.amount ?? 0;
  const charged = chargedAgg._sum.rentAmountMonthly ?? 0;
  const occupancyPct = unitCount > 0 ? Math.round((occupiedUnits / unitCount) * 100) : null;

  // "Needs attention" — concrete, actionable rows, most severe first.
  const attention: AttentionRow[] = [];
  for (const wo of queueWorkOrders.filter((w) => w.slaDeadline < now).slice(0, 3)) {
    const overdueDays = Math.abs(daysFrom(now, wo.slaDeadline));
    attention.push({
      key: `wo-${wo.id}`,
      pill: { label: "Overdue", tone: "red" },
      text: `${wo.issue}${wo.unit ? ` · Unit ${wo.unit}` : ""}`,
      meta: overdueDays === 0 ? "due today" : `overdue ${overdueDays}d${wo.assignee ? "" : " · unassigned"}`,
      href: "/team/work-orders",
    });
  }
  for (const u of pendingVerifications.slice(0, 2)) {
    attention.push({
      key: `verify-${u.id}`,
      pill: { label: "Verify", tone: "amber" },
      text: `${u.name || u.email} — ${roleLabel(u.role)}`,
      meta: `waiting ${formatRelative(u.createdAt).replace(" ago", "")}`,
      href: "/team/access-requests",
    });
  }
  for (const lease of expiringLeases) {
    attention.push({
      key: `lease-${lease.id}`,
      pill: { label: "Renewal", tone: "blue" },
      text: `Unit ${lease.unit?.unitNumber ?? "—"} lease ends in ${daysFrom(now, lease.leaseEndDate)}d`,
      meta: fmtMoney(lease.rentAmountMonthly) + "/mo",
      href: "/team/residents",
    });
  }

  const quickActions: { href: string; label: string; primary?: boolean }[] = isBM
    ? [
        { href: "/team/announcements", label: "Post announcement", primary: true },
        { href: "/team/residents", label: "Add resident" },
        { href: "/team/packages", label: "Log package" },
      ]
    : isConcierge
    ? [
        { href: "/team/packages", label: "Log package", primary: true },
        { href: "/team/residents", label: "Residents" },
        { href: "/team/work-orders", label: "Work orders" },
      ]
    : [
        { href: "/team/work-orders", label: "Work orders", primary: true },
        { href: "/team/units", label: "Units" },
        { href: "/team/documents", label: "Documents" },
      ];

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-6xl mx-auto">
      {/* ── Header: identity + date + quick actions ─────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {roleLabel(appUser.role)} · {todayLabel}
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight truncate">
            {building ? building.name : "Your team"}
          </h1>
          {building && (
            <p className="text-sm text-muted-foreground">
              {building.address}, {building.city}, {building.state} {building.zipCode}
            </p>
          )}
        </div>
        {building && (
          <div className="flex items-center gap-2 flex-wrap">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={
                  a.primary
                    ? "inline-flex items-center gap-1.5 bg-accent text-accent-foreground px-3.5 py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors"
                    : "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm border border-border bg-card hover:bg-muted/40 transition-colors"
                }
              >
                {a.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── No building yet ─────────────────────────────────────────── */}
      {!building && isBM && (
        <div className="mt-6 rounded-md border border-accent/40 bg-accent/5 p-5">
          <h2 className="font-semibold">Set up your first building</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;re verified. Add the building you manage and you&apos;ll be able to invite staff and residents.
          </p>
          <Link
            href="/team/buildings/new"
            className="mt-4 inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            Set up building →
          </Link>
        </div>
      )}
      {!building && !isBM && (
        <p className="mt-4 text-sm text-muted-foreground">
          Your account is not yet linked to a building. Ask your Building Manager.
        </p>
      )}

      {building && (
        <>
          {/* ── Portfolio strip ─────────────────────────────────────── */}
          <Reveal className="mt-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Occupancy"
                value={occupancyPct !== null ? occupancyPct : "—"}
                format="percent"
                hint={unitCount > 0 ? `${occupiedUnits} of ${unitCount} units leased` : "Add units to track occupancy"}
                href={isBM || isFM ? "/team/units" : undefined}
              />
              <StatCard
                label="Open work orders"
                value={openCount}
                hint={
                  openCount === 0
                    ? "Queue is clear"
                    : `${urgentCount} urgent · ${overdueCount} overdue`
                }
                href="/team/work-orders"
              />
              {isBM || isFM ? (
                <StatCard
                  label="Collected this month"
                  value={collected}
                  format="cad"
                  hint={charged > 0 ? `of ${fmtMoney(charged)} charged` : "No active leases recorded"}
                  href={isBM ? "/team/residents" : undefined}
                />
              ) : (
                <StatCard label="Residents" value={residentCount} href="/team/residents" />
              )}
              <StatCard
                label="Packages awaiting"
                value={pendingPackages}
                hint={pendingPackages === 0 ? "Shelf is clear" : "Awaiting pickup"}
                href={isBM || isConcierge ? "/team/packages" : undefined}
              />
            </div>
          </Reveal>

          {/* ── Needs attention ─────────────────────────────────────── */}
          <Reveal delay={0.06}>
          <section className="mt-10">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Needs attention
              </h2>
            </div>
            {attention.length === 0 ? (
              <div className="bg-card border border-emerald-500/30 rounded-md px-5 py-4 text-sm flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                <span className="text-muted-foreground">
                  All clear — nothing is overdue, unverified, or expiring soon.
                </span>
              </div>
            ) : (
              <ul className="bg-card border border-border rounded-md divide-y divide-border">
                {attention.map((row) => (
                  <li key={row.key}>
                    <Link
                      href={row.href}
                      className="px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors group"
                    >
                      <StatusPill label={row.pill.label} tone={row.pill.tone} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.text}</span>
                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{row.meta}</span>
                      <span className="text-accent text-sm shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          </Reveal>

          {/* ── Work queue + activity rail ──────────────────────────── */}
          <Reveal delay={0.12}>
          <div className="mt-10 grid lg:grid-cols-3 gap-8">
            <section className="lg:col-span-2">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                  Work queue · most overdue first
                </h2>
                <Link href="/team/work-orders" className="text-xs text-accent hover:underline">
                  View all
                </Link>
              </div>
              {queueWorkOrders.length === 0 ? (
                <EmptyState
                  icon="tools"
                  title="No open work orders"
                  description="When residents submit a maintenance request you'll see it here."
                />
              ) : (
                <ul className="space-y-2">
                  {queueWorkOrders.map((wo) => {
                    const slaDays = daysFrom(now, wo.slaDeadline);
                    return (
                      <li key={wo.id} className="bg-card border border-border rounded-md px-4 py-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{wo.issue}</span>
                              {wo.unit && <span className="text-xs text-muted-foreground">Unit {wo.unit}</span>}
                            </div>
                            <div className="text-xs text-muted-foreground/85 mt-1">
                              {wo.openedBy ? (wo.openedBy.name || wo.openedBy.email) : "—"}
                              {" · "}
                              {formatRelative(wo.createdAt)}
                              {" · "}
                              {wo.assignee
                                ? `assigned to ${wo.assignee.name || wo.assignee.email}`
                                : "unassigned"}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                            <StatusPill label={wo.priority} tone={PRIORITY_TONE[wo.priority] ?? "neutral"} />
                            <StatusPill
                              label={
                                slaDays < 0
                                  ? `Overdue ${Math.abs(slaDays)}d`
                                  : slaDays === 0
                                  ? "Due today"
                                  : `Due ${slaDays}d`
                              }
                              tone={slaDays < 0 ? "red" : slaDays <= 1 ? "amber" : "neutral"}
                            />
                            <StatusPill label={wo.status.replace("_", " ")} tone={workOrderTone(wo.status)} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <aside className="space-y-8">
              <section>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    Announcements
                  </h2>
                  {isBM && (
                    <Link href="/team/announcements" className="text-xs text-accent hover:underline">
                      Post
                    </Link>
                  )}
                </div>
                {recentAnnouncements.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-card border border-border rounded-md px-4 py-3">
                    Nothing posted yet.
                  </p>
                ) : (
                  <ul className="bg-card border border-border rounded-md divide-y divide-border">
                    {recentAnnouncements.map((a) => (
                      <li key={a.id} className="px-4 py-3">
                        <div className="text-sm font-medium truncate">{a.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{formatRelative(a.createdAt)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    Newest residents
                  </h2>
                  <Link href="/team/residents" className="text-xs text-accent hover:underline">
                    View all
                  </Link>
                </div>
                {newestResidents.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-card border border-border rounded-md px-4 py-3">
                    No residents yet.
                  </p>
                ) : (
                  <ul className="bg-card border border-border rounded-md divide-y divide-border">
                    {newestResidents.map((u) => (
                      <li key={u.id} className="px-4 py-3">
                        <div className="text-sm font-medium truncate">{u.name || u.email}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {u.unitRel?.unitNumber ? `Unit ${u.unitRel.unitNumber} · ` : ""}
                          joined {formatRelative(u.createdAt)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          </div>
          </Reveal>
        </>
      )}
    </main>
  );
}
