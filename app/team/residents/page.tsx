import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { Avatar } from "@/components/Avatar";
import { ResidentOnboardPanel } from "./ResidentOnboardPanel";
import { LeaseSection } from "./LeaseSection";

export default async function TeamResidentsPage() {
  const { appUser } = await requireTeam();

  if (!appUser.buildingId) {
    return (
      <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight">Residents</h1>
        <p className="mt-3 text-sm text-muted-foreground">No building assigned to your account.</p>
      </main>
    );
  }

  const canAdd = can(appUser, "resident.manage");

  const [residents, units, leases, building] = await Promise.all([
    prisma.user.findMany({
      where: {
        buildingId: appUser.buildingId,
        role: { in: ["resident", "tenant"] },
      },
      include: { unitRel: { select: { unitNumber: true } } },
      orderBy: [{ role: "asc" }, { email: "asc" }],
    }),
    prisma.unit.findMany({
      where: { buildingId: appUser.buildingId },
      orderBy: { unitNumber: "asc" },
      select: { id: true, unitNumber: true },
    }),
    canAdd
      ? prisma.lease.findMany({
          where: { buildingId: appUser.buildingId, archivedAt: null, status: "active" },
          orderBy: { leaseStartDate: "desc" },
          include: {
            tenant: { select: { name: true, email: true } },
            unit: { select: { unitNumber: true } },
          },
        })
      : Promise.resolve([]),
    prisma.building
      .findUnique({
        where: { id: appUser.buildingId },
        select: { inviteCode: true },
      })
      .catch(() => null),
  ]);

  // Counts for the header. Splits resident vs tenant so BMs can see
  // the mix at a glance — common question for compliance + billing.
  const residentCount = residents.filter((r) => r.role === "resident").length;
  const tenantCount = residents.filter((r) => r.role === "tenant").length;
  const total = residents.length;

  const signupBaseUrl = process.env.APP_BASE_URL || "https://www.buildingsync.app";

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
      <header>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Residents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total === 0
            ? "No residents in this building yet."
            : `${total} in this building · ${residentCount} resident${residentCount === 1 ? "" : "s"}, ${tenantCount} tenant${tenantCount === 1 ? "" : "s"}`}
        </p>
      </header>

      {canAdd && (
        <div className="mt-8">
          <ResidentOnboardPanel
            units={units}
            inviteCode={building?.inviteCode ?? null}
            signupBaseUrl={signupBaseUrl}
            defaultOpen={total === 0}
          />
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
          All residents · {total}
        </h2>
        {residents.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-md p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <path d="M20 8v6 M23 11h-6" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">No residents linked yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canAdd
                ? "Use one of the three options above to start onboarding."
                : "Once your Building Manager links residents, you'll see them here."}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-md overflow-hidden">
            <ul className="divide-y divide-border">
              {residents.map((r) => (
                <li key={r.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={r.name} email={r.email} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.name || r.email}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                    </div>
                  </div>
                  <div className="text-sm flex items-center gap-3 shrink-0">
                    {(r.unitRel || r.unit) && (
                      <span className="text-muted-foreground tabular-nums">
                        Unit {r.unitRel?.unitNumber || r.unit}
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border border-border bg-muted/30">
                      {r.role}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {canAdd && (
        <LeaseSection
          tenants={residents.map((r) => ({ id: r.id, email: r.email, name: r.name }))}
          units={units}
          leases={leases.map((l) => ({
            id: l.id,
            tenantLabel: l.tenant?.name || l.tenant?.email || "—",
            unitLabel: l.unit?.unitNumber || "—",
            rentAmountMonthly: l.rentAmountMonthly,
            leaseStartDate: l.leaseStartDate.toISOString(),
            leaseEndDate: l.leaseEndDate.toISOString(),
            leaseType: l.leaseType,
          }))}
        />
      )}
    </main>
  );
}
