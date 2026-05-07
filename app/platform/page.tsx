import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/StatCard";
import { Avatar } from "@/components/Avatar";
import { formatRelative } from "@/lib/format";
import { VerificationActions } from "./verifications/VerificationActions";

export default async function PlatformDashboard() {
  await requirePlatformAdmin();

  const [pendingBMs, buildings, totalUsers, totalUnits, totalWorkOrders] = await Promise.all([
    // Building managers awaiting admin verification — ordered oldest-first so
    // the queue acts FIFO. archivedAt:null filter excludes already-rejected.
    prisma.user.findMany({
      where: { role: "building_manager", verifiedAt: null, archivedAt: null },
      select: { id: true, email: true, name: true, createdAt: true, buildingId: true,
                building: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.building.findMany({
      include: { _count: { select: { users: true, units: true, workOrders: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
    prisma.unit.count(),
    prisma.workOrder.count(),
  ]);

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-6xl mx-auto">
      <div className="space-y-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Platform admin
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Cross-building view. Use it to onboard new sites and verify Building Manager accounts.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Buildings" value={buildings.length} />
        <StatCard label="Users" value={totalUsers} href="/platform/users" />
        <StatCard label="Units" value={totalUnits} />
        <StatCard label="Work orders" value={totalWorkOrders} />
      </div>

      {pendingBMs.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-300">
              Pending Building Manager verification · {pendingBMs.length}
            </h2>
          </div>
          <div className="bg-card border border-amber-500/30 rounded-md overflow-hidden">
            <ul className="divide-y divide-border">
              {pendingBMs.map((u) => (
                <li key={u.id} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={u.name} email={u.email} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.name || u.email}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {u.email}
                        {u.building?.name && <span> · {u.building.name}</span>}
                        <span> · signed up {formatRelative(u.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <VerificationActions userId={u.id} email={u.email} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            Buildings
          </h2>
          <Link
            href="/platform/buildings/new"
            className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
          >
            + New building
          </Link>
        </div>
        {buildings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No buildings yet.</p>
        ) : (
          <div className="bg-card border border-border rounded-md overflow-hidden">
            <ul className="divide-y divide-border">
              {buildings.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/platform/buildings/${b.id}`}
                    className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{b.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {b.address}, {b.city}, {b.state} {b.zipCode}
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                      <span>{b._count.users} users</span>
                      <span>{b._count.units} units</span>
                      <span>{b._count.workOrders} WO</span>
                      <span aria-hidden className="text-muted-foreground/80">›</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <p className="mt-12 text-xs text-muted-foreground">
        Onboarding stats, billing, support tools, and the building → owner mapping land post-launch.
      </p>
    </main>
  );
}
