import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { WorkOrderRow } from "./WorkOrderRow";

export default async function AdminWorkOrdersPage() {
  const { appUser } = await requireAdmin();

  if (!appUser.buildingId) {
    return (
      <main className="px-6 py-10 max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold">Work orders</h1>
        <p className="mt-3 opacity-70 text-sm">No building assigned to your account.</p>
      </main>
    );
  }

  const workOrders = await prisma.workOrder.findMany({
    where: { buildingId: appUser.buildingId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      openedBy: { select: { email: true, name: true } },
      unit: { select: { unitNumber: true } },
      assignedTo: { select: { email: true, name: true } },
    },
    take: 100,
  });

  const canAct = appUser.role === "facility_manager" || appUser.role === "building_manager";

  return (
    <main className="px-6 py-10 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">Work orders</h1>
      <p className="mt-1 text-sm opacity-60">{workOrders.length} total</p>

      {workOrders.length === 0 ? (
        <p className="mt-6 text-sm opacity-70">No work orders yet. Residents submit them from /dashboard/maintenance.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {workOrders.map((wo) => (
            <WorkOrderRow
              key={wo.id}
              workOrder={{
                id: wo.id,
                title: wo.title,
                description: wo.description,
                status: wo.status,
                createdAt: wo.createdAt.toISOString(),
                openedByLabel: wo.openedBy.name || wo.openedBy.email,
                unitLabel: wo.unit?.unitNumber || null,
                assignedToLabel: wo.assignedTo ? wo.assignedTo.name || wo.assignedTo.email : null,
              }}
              canAct={canAct}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
