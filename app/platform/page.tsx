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
      select: {
        id: true, email: true, name: true, createdAt: true, buildingId: true,
        building: { select: { name: true } },
        // BM verification fields captured at signup. Reviewer uses
        // these to cross-check Ontario Business Registry + CMRAO.
        company: true, managerType: true, businessNumber: true, licenseNumber: true,
        region: true, city: true, postalCode: true,
      },
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
              {pendingBMs.map((u) => {
                // Build the quick-verify links: OBR (Ontario Business
                // Registry) search by company name; CMRAO licensee
                // search by licence number. Reviewer clicks → confirms
                // → approves.
                const obrUrl = u.company
                  ? `https://www.appmybizaccount.gov.on.ca/onbis/search?searchValue=${encodeURIComponent(u.company)}`
                  : null;
                const cmraoUrl = u.licenseNumber
                  ? `https://www.cmrao.ca/find-a-registrant?q=${encodeURIComponent(u.licenseNumber)}`
                  : "https://www.cmrao.ca/find-a-registrant";
                const corpsCanadaUrl = u.businessNumber
                  ? `https://www.ic.gc.ca/app/scr/cc/CorporationsCanada/fdrlCrpSrch.html?searchValue=${encodeURIComponent(u.businessNumber)}`
                  : null;

                return (
                  <li key={u.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Avatar name={u.name} email={u.email} />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div>
                          <div className="font-medium truncate">{u.name || u.email}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {u.email}
                            {u.building?.name && <span> · {u.building.name}</span>}
                            <span> · signed up {formatRelative(u.createdAt)}</span>
                          </div>
                        </div>

                        {/* Verification facts captured at signup. */}
                        <div className="text-xs space-y-1 bg-muted/30 border border-border rounded-md p-3">
                          <div>
                            <span className="text-muted-foreground">Company: </span>
                            <span className="font-medium text-foreground">{u.company || "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Type: </span>
                            <span className="text-foreground">
                              {u.managerType ? u.managerType.replace(/_/g, " ") : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">BN: </span>
                            <span className="font-mono text-foreground">{u.businessNumber || "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">CMRAO licence: </span>
                            <span className="font-mono text-foreground">{u.licenseNumber || "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Region: </span>
                            <span className="text-foreground">
                              {u.region || "—"}{u.city ? ` · ${u.city}` : ""}{u.postalCode ? ` · ${u.postalCode}` : ""}
                            </span>
                          </div>
                        </div>

                        {/* One-click verification links. */}
                        <div className="flex flex-wrap gap-2 text-xs">
                          {obrUrl && (
                            <a href={obrUrl} target="_blank" rel="noopener noreferrer"
                               className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-border bg-background hover:bg-muted transition-colors">
                              Search OBR (company) →
                            </a>
                          )}
                          {corpsCanadaUrl && (
                            <a href={corpsCanadaUrl} target="_blank" rel="noopener noreferrer"
                               className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-border bg-background hover:bg-muted transition-colors">
                              Search Corporations Canada (BN) →
                            </a>
                          )}
                          {u.managerType === "cmrao_licensed" && (
                            <a href={cmraoUrl} target="_blank" rel="noopener noreferrer"
                               className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-border bg-background hover:bg-muted transition-colors">
                              Look up CMRAO registrant →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <VerificationActions
                      userId={u.id}
                      email={u.email}
                      company={u.company}
                      managerType={u.managerType}
                      businessNumber={u.businessNumber}
                      licenseNumber={u.licenseNumber}
                    />
                  </li>
                );
              })}
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
            className="text-sm px-4 py-2 sm:px-3 sm:py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
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
