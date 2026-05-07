import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/EmptyState";
import { ReportIncidentForm } from "./ReportIncidentForm";
import { IncidentRow } from "./IncidentRow";

const RESOLUTION_ROLES = ["building_manager", "facility_manager"];

export default async function TeamIncidentsPage() {
  const { appUser } = await requireTeam();

  if (!appUser.buildingId) {
    return (
      <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight">Incidents</h1>
        <p className="mt-3 text-sm text-muted-foreground">No building assigned to your account.</p>
      </main>
    );
  }

  const incidents = await prisma.incident.findMany({
    where: { buildingId: appUser.buildingId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { reportedBy: { select: { name: true, email: true } } },
  });

  const canResolve = RESOLUTION_ROLES.includes(appUser.role);
  const open = incidents.filter((i) => i.status !== "resolved");
  const resolved = incidents.filter((i) => i.status === "resolved");

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Incidents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {open.length} open · {resolved.length} resolved
          </p>
        </div>
      </div>

      <section className="mt-8 bg-card border border-border rounded-md p-5">
        <h2 className="text-base font-semibold">Log an incident</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Security, safety, noise, or damage events. Building Manager and Facility Manager get notified and can mark the incident resolved.
        </p>
        <ReportIncidentForm />
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
          Open incidents
        </h2>
        {open.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon="inbox"
              title="No open incidents"
              description="Things are quiet. New reports show up here for triage."
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {open.map((i) => (
              <IncidentRow
                key={i.id}
                canResolve={canResolve}
                incident={{
                  id: i.id,
                  type: i.type,
                  severity: i.severity,
                  status: i.status,
                  title: i.title,
                  description: i.description,
                  location: i.location,
                  createdAt: i.createdAt.toISOString(),
                  reporterLabel: i.reportedBy?.name || i.reportedBy?.email || "—",
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {resolved.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            Resolved
          </h2>
          <ul className="mt-3 space-y-2 opacity-80">
            {resolved.slice(0, 20).map((i) => (
              <IncidentRow
                key={i.id}
                canResolve={canResolve}
                incident={{
                  id: i.id,
                  type: i.type,
                  severity: i.severity,
                  status: i.status,
                  title: i.title,
                  description: i.description,
                  location: i.location,
                  createdAt: i.createdAt.toISOString(),
                  reporterLabel: i.reportedBy?.name || i.reportedBy?.email || "—",
                }}
              />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
