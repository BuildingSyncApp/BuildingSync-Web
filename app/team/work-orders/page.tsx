import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/EmptyState";
import { WorkOrderRow } from "./WorkOrderRow";

export default async function TeamWorkOrdersPage() {
  const { appUser } = await requireTeam();

  if (!appUser.buildingId) {
    return (
      <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Work orders</h1>
        <p className="mt-3 text-sm text-muted-foreground">No building assigned to your account.</p>
      </main>
    );
  }

  const workOrders = await prisma.workOrder.findMany({
    where: { buildingId: appUser.buildingId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      openedBy: { select: { email: true, name: true } },
      assignee: { select: { email: true, name: true } },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { email: true, name: true } } },
      },
    },
    take: 100,
  });

  const canAct = appUser.role === "facility_manager" || appUser.role === "building_manager";

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
      <div className="flex items-baseline gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Work orders</h1>
        {!canAct && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border border-border bg-muted/30 text-muted-foreground">
            View only
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{workOrders.length} total</p>

      {workOrders.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon="tools"
            title="No work orders yet"
            description="Residents submit maintenance requests from their dashboard. They'll show up here as they come in, with email notifications to the team."
          />
        </div>
      ) : (
        <ul className="mt-8 space-y-2">
          {workOrders.map((wo) => (
            <WorkOrderRow
              key={wo.id}
              workOrder={{
                id: wo.id,
                title: wo.issue,
                description: wo.description,
                status: wo.status,
                createdAt: wo.createdAt.toISOString(),
                openedByLabel: wo.openedBy ? (wo.openedBy.name || wo.openedBy.email) : "—",
                unitLabel: wo.unit || null,
                assignedToLabel: wo.assignee ? (wo.assignee.name || wo.assignee.email) : null,
              }}
              notes={wo.notes.map((n) => ({
                id: n.id,
                body: n.body,
                createdAt: n.createdAt.toISOString(),
                authorName: n.author?.name ?? null,
                authorEmail: n.author?.email ?? "",
              }))}
              canAct={canAct}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
