import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRelative } from "@/lib/format";
import { StatusPill, workOrderTone } from "@/components/StatusPill";

export default async function DashboardPage() {
  const { appUser } = await requireUser();

  // Each query is .catch'd individually — one failed read shouldn't crash
  // the dashboard. Surfaces empty state for that section instead. Layout
  // has already redirected staff and fetched notifications.
  const [building, unit, recentWorkOrders, recentAnnouncements] = await Promise.all([
    appUser.buildingId
      ? prisma.building.findUnique({ where: { id: appUser.buildingId } }).catch(() => null)
      : Promise.resolve(null),
    appUser.unitId
      ? prisma.unit.findUnique({ where: { id: appUser.unitId } }).catch(() => null)
      : Promise.resolve(null),
    prisma.workOrder.findMany({
      where: { openedById: appUser.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, issue: true, status: true, createdAt: true },
    }).catch((err) => {
      console.error("[dashboard] workOrder.findMany failed", err);
      return [];
    }),
    appUser.buildingId
      ? prisma.announcement.findMany({
          where: {
            buildingId: appUser.buildingId,
            deletedAt: null,
            // Audience filter: residents see "all" + their-unit specific_units;
            // tenants additionally see tenants_only.
            OR: [
              { audience: "all" },
              ...(appUser.role === "tenant" ? [{ audience: "tenants_only" as const }] : []),
              ...(appUser.unitId
                ? [{ audience: "specific_units" as const, targetUnitIds: { has: appUser.unitId } }]
                : []),
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 2,
          select: { id: true, title: true, body: true, createdAt: true },
        }).catch((err) => {
          console.error("[dashboard] announcement.findMany failed", err);
          return [];
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-3xl mx-auto">
      {building ? (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Your building</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{building.name}</h1>
          <p className="text-sm text-muted-foreground">
            {unit ? `Unit ${unit.unitNumber} · ` : ""}{building.address}, {building.city}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4v18" />
              <path d="M19 21V11l-6-4" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Welcome to BuildingSync</h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your account isn&apos;t linked to a building yet. Ask your Building Manager to add you — you&apos;ll see your unit, work orders, and announcements here once they do.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Already onboarded but still seeing this? Email{" "}
            <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">info@buildingsync.app</a>.
          </p>
        </div>
      )}

      <nav className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/dashboard/maintenance"
          className="block bg-card border border-border rounded-md p-5 hover:border-accent transition-colors"
        >
          <div className="font-semibold">Maintenance</div>
          <div className="text-sm text-muted-foreground mt-1">Request a repair, see open tickets</div>
        </Link>
        <Link
          href="/dashboard/announcements"
          className="block bg-card border border-border rounded-md p-5 hover:border-accent transition-colors"
        >
          <div className="font-semibold">Announcements</div>
          <div className="text-sm text-muted-foreground mt-1">Notices from your building team</div>
        </Link>
      </nav>

      {recentWorkOrders.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Your recent requests
            </h2>
            <Link href="/dashboard/maintenance" className="text-xs text-accent hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {recentWorkOrders.map((wo) => (
              <li key={wo.id} className="bg-card border border-border rounded-md px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{wo.issue}</div>
                  <div className="text-xs text-muted-foreground/85 mt-0.5">
                    {formatRelative(wo.createdAt)}
                  </div>
                </div>
                <StatusPill
                  label={wo.status.replace("_", " ")}
                  tone={workOrderTone(wo.status)}
                  className="shrink-0"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {recentAnnouncements.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Latest announcements
            </h2>
            <Link href="/dashboard/announcements" className="text-xs text-accent hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {recentAnnouncements.map((a) => (
              <li key={a.id} className="bg-card border border-border rounded-md px-4 py-3">
                <div className="font-medium">{a.title}</div>
                <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.body}</div>
                <div className="text-xs text-muted-foreground/85 mt-2">
                  {formatRelative(a.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
